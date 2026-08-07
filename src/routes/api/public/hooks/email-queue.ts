import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/hooks/email-queue")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey =
          request.headers.get("apikey") ??
          request.headers.get("authorization")?.replace("Bearer ", "");
        const expected =
          process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["VITE_SUPABASE_PUBLISHABLE_KEY"];

        if (!expected || !apiKey || apiKey !== expected) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        try {
          const { drainEmailQueue } = await import("@/lib/emailSender.server");
          const summary = await drainEmailQueue(25);
          return Response.json({ ok: true, ...summary });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          console.error(`Email queue worker failed: ${message}`);
          return new Response(JSON.stringify({ ok: false, error: message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
      },
    },
  },
});
