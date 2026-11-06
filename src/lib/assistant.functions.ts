import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Input = z.object({
  context: z.string().max(20000),
  messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).min(1).max(20),
});

const SYSTEM = `Bạn là "Trợ lý FiGo", chuyên gia tài chính cá nhân nói tiếng Việt, giọng thân thiện như một người bạn tư vấn.
NGUYÊN TẮC BẮT BUỘC:
1. Mọi số tiền phải tính chính xác từ DỮ LIỆU bên dưới: cộng/trừ từng giao dịch bằng số trong dữ liệu, KHÔNG bịa, KHÔNG phỏng đoán.
2. Khi người dùng hỏi "hôm nay tôi tiêu bao nhiêu": tổng hợp đúng các giao dịch ngày hôm nay (ngày hiện tại có trong DỮ LIỆU), kể rõ từng khoản.
3. Trả lời bằng giọng văn tự nhiên, súc tích, ví dụ: "Hôm nay bạn đã chi tổng cộng 125.000 đ cho 2 giao dịch: Cà phê 85.000 đ và Ăn trưa 145.000 đ."
4. Tiền viết dạng 1.500.000 đ, ngày DD/MM/YYYY. Dùng gạch đầu dòng khi liệt kê nhiều khoản.
5. Kết thúc bằng 1 lời khuyên thực tế, ngắn (1 câu).
6. Nếu dữ liệu không đủ để trả lời, nói rõ điều đó và gợi ý ghi thêm giao dịch.`;

export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { text: "", error: "Trợ lý AI chưa được cấu hình." };
    const provider = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });
    try {
      const result = streamText({
        model: provider.responses("openai/gpt-6-astra"),
        instructions: `${SYSTEM}\n\nDỮ LIỆU:\n${data.context}`,
        messages: data.messages,
        providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
      } as Parameters<typeof streamText>[0]);
      const text = await result.text;
      return { text, error: text ? null : "Trợ lý chưa trả lời được, thử lại sau." };
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      console.error("assistant error", e);
      if (status === 429) return { text: "", error: "Đang có nhiều yêu cầu, thử lại sau ít phút." };
      if (status === 402) return { text: "", error: "Đã hết lượt dùng AI miễn phí của tháng." };
      return { text: "", error: "Không kết nối được trợ lý AI." };
    }
  });
