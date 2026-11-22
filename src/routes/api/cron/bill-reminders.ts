import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import { billAlerts } from "@/lib/reminders";
import { formatVnd } from "@/lib/format";
import type { Bill } from "@/lib/types";

/**
 * Chạy mỗi sáng (Vercel Cron): gửi email cho người dùng có hoá đơn còn tối đa 3 ngày.
 * Mỗi hoá đơn chỉ gửi một lần cho mỗi kỳ (ghi vào bảng reminder_log).
 * Thử tay: /api/cron/bill-reminders?key=CRON_SECRET&dry=1  (dry=1: chỉ xem, không gửi)
 */
async function authorized(request: Request) {
  const secret = process.env["CRON_SECRET"];
  if (!secret) return false;
  const bearer = /^Bearer (\S+)$/.exec(request.headers.get("authorization") ?? "")?.[1];
  const token = bearer ?? new URL(request.url).searchParams.get("key") ?? "";
  const { createHash, timingSafeEqual } = await import("node:crypto");
  const digest = (v: string) => createHash("sha256").update(v, "utf8").digest();
  return timingSafeEqual(digest(token), digest(secret));
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

function buildEmail(name: string, items: { bill: Bill; due: Date; daysLeft: number }[], site: string) {
  const when = (d: number) => (d === 0 ? "đến hạn hôm nay" : `còn ${d} ngày`);
  const rows = items
    .map((a) => `<tr><td style="padding:12px 0;border-bottom:1px solid #eef2f0"><div style="font-weight:700;color:#0f172a">${esc(a.bill.name)}</div><div style="font-size:13px;color:#64748b">Hạn ${format(a.due, "dd/MM/yyyy")} · ${when(a.daysLeft)}</div></td><td style="padding:12px 0;border-bottom:1px solid #eef2f0;text-align:right;font-weight:700;color:#0f172a">${esc(formatVnd(a.bill.amount))}</td></tr>`)
    .join("");
  const html = `<div style="background:#f4f7f5;padding:24px;font-family:-apple-system,Segoe UI,Roboto,sans-serif"><div style="max-width:480px;margin:auto;background:#fff;border-radius:20px;overflow:hidden"><div style="background:#08a06b;padding:16px 24px"><img src="${esc(site)}/logo.png" width="36" height="36" alt="FiGo" style="vertical-align:middle;border-radius:9px"><span style="vertical-align:middle;margin-left:10px;color:#fff;font-size:20px;font-weight:800">FiGo</span></div><div style="padding:24px"><p style="margin:0 0 4px;font-size:18px;font-weight:800;color:#0f172a">Chào ${esc(name)}, có hoá đơn sắp đến hạn</p><p style="margin:0 0 16px;color:#64748b;font-size:14px">Bạn nhớ thanh toán đúng hạn nhé.</p><table style="width:100%;border-collapse:collapse">${rows}</table><p style="margin:24px 0 0"><a href="${esc(site)}" style="display:inline-block;background:#08a06b;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px">Mở FiGo</a></p><p style="margin:20px 0 0;font-size:12px;color:#94a3b8">Bạn nhận email này vì đã bật nhắc hoá đơn. Tắt trong FiGo, mục Cài đặt, "Nhắc hoá đơn qua email".</p></div></div></div>`;
  const text = `Chào ${name}, có hoá đơn sắp đến hạn:\n` + items.map((a) => `- ${a.bill.name}: ${formatVnd(a.bill.amount)} (${format(a.due, "dd/MM/yyyy")}, ${when(a.daysLeft)})`).join("\n") + `\n\nMở FiGo: ${site}`;
  return { html, text, subject: items.length === 1 ? `FiGo nhắc bạn: ${items[0]!.bill.name} ${when(items[0]!.daysLeft)}` : `FiGo nhắc bạn: ${items.length} hoá đơn sắp đến hạn` };
}

export const Route = createFileRoute("/api/cron/bill-reminders")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await authorized(request))) return new Response("Unauthorized", { status: 401 });
        const url = new URL(request.url);
        const dry = url.searchParams.get("dry") === "1";
        const site = process.env["SITE_URL"] || url.origin;
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const db = supabaseAdmin as any;

        // Giờ Việt Nam (máy chủ chạy giờ UTC): cộng 7 giờ để "hôm nay" đúng ngày của người dùng.
        const vnNow = new Date(Date.now() + 7 * 3600_000);

        const { data: rows, error } = await db.from("user_data").select("user_id, data").limit(2000);
        if (error) return Response.json({ ok: false, step: "user_data", error: error.message }, { status: 500 });

        const planned = new Map<string, { bill: Bill; due: Date; daysLeft: number; key: string }[]>();
        for (const r of (rows ?? []) as { user_id: string; data: { bills?: Bill[] } | null }[]) {
          const bills = Array.isArray(r.data?.bills) ? r.data!.bills! : [];
          const list = billAlerts(bills, vnNow, 3).filter((a) => !a.overdue);
          if (list.length) planned.set(r.user_id, list.map((a) => ({ bill: a.bill, due: a.due, daysLeft: a.daysLeft, key: a.key })));
        }
        const ids = [...planned.keys()];
        if (ids.length === 0) return Response.json({ ok: true, dry, users: 0, sent: 0, note: "Không có hoá đơn nào cần nhắc hôm nay." });

        const { data: profs, error: pErr } = await db.from("profiles").select("id, display_name, email_reminders").in("id", ids);
        if (pErr) return Response.json({ ok: false, step: "profiles", error: pErr.message, hint: "Đã chạy file figo-reminders.sql trong Supabase chưa?" }, { status: 500 });
        const prof = new Map<string, { display_name: string | null; email_reminders: boolean | null }>((profs ?? []).map((p: { id: string; display_name: string | null; email_reminders: boolean | null }) => [p.id, p]));

        const { data: logs, error: lErr } = await db.from("reminder_log").select("user_id, bill_id, period").in("user_id", ids);
        if (lErr) return Response.json({ ok: false, step: "reminder_log", error: lErr.message, hint: "Đã chạy file figo-reminders.sql trong Supabase chưa?" }, { status: 500 });
        const done = new Set<string>((logs ?? []).map((l: { user_id: string; bill_id: string; period: string }) => `${l.user_id}|${l.bill_id}|${l.period}`));

        const result: { user: string; to?: string; bills: string[]; status: string }[] = [];
        let transporter: { sendMail: (o: Record<string, unknown>) => Promise<unknown> } | null = null;
        const user = process.env["GMAIL_USER"], pass = process.env["GMAIL_APP_PASSWORD"];
        if (!dry) {
          if (!user || !pass) return Response.json({ ok: false, error: "Thiếu GMAIL_USER hoặc GMAIL_APP_PASSWORD trên Vercel." }, { status: 500 });
          const nodemailer = (await import("nodemailer")).default;
          transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
        }

        let sent = 0;
        for (const uid of ids) {
          const p = prof.get(uid);
          const items = planned.get(uid)!.filter((a) => !done.has(`${uid}|${a.bill.id}|${a.key}`));
          if (p?.email_reminders === false) { result.push({ user: uid, bills: items.map((a) => a.bill.name), status: "đã tắt nhắc email" }); continue; }
          if (items.length === 0) { result.push({ user: uid, bills: [], status: "đã gửi trước đó" }); continue; }
          const { data: u } = await db.auth.admin.getUserById(uid);
          const to: string | undefined = u?.user?.email;
          if (!to) { result.push({ user: uid, bills: items.map((a) => a.bill.name), status: "không có email" }); continue; }
          if (dry || !transporter) { result.push({ user: uid, to, bills: items.map((a) => a.bill.name), status: "sẽ gửi (chạy thử)" }); continue; }
          try {
            const mail = buildEmail(p?.display_name || to.split("@")[0]!, items, site);
            await transporter.sendMail({ from: `"FiGo" <${user}>`, to, subject: mail.subject, html: mail.html, text: mail.text });
            await db.from("reminder_log").upsert(items.map((a) => ({ user_id: uid, bill_id: a.bill.id, period: a.key })), { onConflict: "user_id,bill_id,period", ignoreDuplicates: true });
            sent++;
            result.push({ user: uid, to, bills: items.map((a) => a.bill.name), status: "đã gửi" });
          } catch (e) {
            result.push({ user: uid, to, bills: items.map((a) => a.bill.name), status: `lỗi gửi: ${(e as Error).message}` });
          }
        }
        return Response.json({ ok: true, dry, users: ids.length, sent, result });
      },
    },
  },
});
