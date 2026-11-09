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

// Cấu hình AI qua biến môi trường (đặt trong Vercel → Settings → Environment Variables):
//   AI_API_KEY   (bắt buộc trên Vercel) — API key của OpenAI / Gemini / OpenRouter...
//   AI_BASE_URL  (tuỳ chọn) — mặc định https://api.openai.com/v1
//   AI_MODEL     (tuỳ chọn) — mặc định gpt-4o-mini
// Khi chạy trong Lovable, LOVABLE_API_KEY vẫn được dùng như cũ.
export const askAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }) => {
    const ownKey = process.env["AI_API_KEY"];
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const key = ownKey || lovableKey;
    if (!key) {
      console.error("[assistant] Thiếu AI_API_KEY (hoặc LOVABLE_API_KEY) trong biến môi trường.");
      return { text: "", error: "Trợ lý AI chưa được cấu hình." };
    }

    const useOwn = Boolean(ownKey);
    const provider = useOwn
      ? createOpenAI({
          baseURL: process.env["AI_BASE_URL"] || "https://api.openai.com/v1",
          apiKey: key,
        })
      : createOpenAI({
          baseURL: "https://ai.gateway.lovable.dev/v1",
          apiKey: key,
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
        });

    try {
      const result = streamText(
        (useOwn
          ? {
              model: provider.chat(process.env["AI_MODEL"] || "gpt-4o-mini"),
              instructions: `${SYSTEM}\n\nDỮ LIỆU:\n${data.context}`,
              messages: data.messages,
            }
          : {
              model: provider.responses("openai/gpt-6-astra"),
              instructions: `${SYSTEM}\n\nDỮ LIỆU:\n${data.context}`,
              messages: data.messages,
              providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
            }) as Parameters<typeof streamText>[0],
      );
      const text = await result.text;
      return { text, error: text ? null : "Trợ lý chưa trả lời được, thử lại sau." };
    } catch (e) {
      const status = (e as { statusCode?: number }).statusCode;
      console.error("assistant error", e);
      if (status === 429) return { text: "", error: "Đang có nhiều yêu cầu, thử lại sau ít phút." };
      if (status === 402) return { text: "", error: "Đã hết lượt dùng AI miễn phí của tháng." };
      if (status === 401 || status === 403) return { text: "", error: "API key AI không hợp lệ hoặc hết hạn." };
      return { text: "", error: "Không kết nối được trợ lý AI." };
    }
  });
