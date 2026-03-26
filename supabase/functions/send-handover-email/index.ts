import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { userId, customerName, customerEmail, customerPhone, message, channel, ticketId } = await req.json()

    if (!userId) {
      return new Response(JSON.stringify({ error: 'Missing userId' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    // Fetch user settings to get support_email
    const { data: settings, error: settingsError } = await supabase
      .from('user_settings')
      .select('support_email')
      .eq('user_id', userId)
      .single()

    if (settingsError || !settings?.support_email) {
      console.error('Support email not configured for user:', userId, settingsError)
      return new Response(JSON.stringify({ error: 'Support email not configured' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      })
    }

    if (!RESEND_API_KEY) {
      console.error('RESEND_API_KEY not configured in Edge Function')
      return new Response(JSON.stringify({ error: 'Internal server error (Email configuration missing)' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      })
    }

    const supportEmail = settings.support_email
    const subject = `🔔 [${ticketId || 'جديد'}] طلب تواصل بشري - ${customerName || 'عميل'}`
    
    const htmlContent = `
      <div dir="rtl" style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
        <h2 style="color: #e11d48;">طلب مساعدة بشرية جديد - تذكرة #${ticketId || '---'}</h2>
        <p>لديك طلب تواصل جديد من عميل عبر قناة: <strong>${channel || 'الويب'}</strong></p>
        <hr />
        <p><strong>تفاصيل العميل:</strong></p>
        <ul style="list-style: none; padding: 0;">
          <li>👤 <strong>الاسم:</strong> ${customerName || 'غير متوفر'}</li>
          <li>📧 <strong>الإيميل:</strong> ${customerEmail || 'غير متوفر'}</li>
          <li>📱 <strong>الجوال:</strong> ${customerPhone || 'غير متوفر'}</li>
        </ul>
        <hr />
        <p><strong>آخر رسالة من العميل:</strong></p>
        <blockquote style="background: #f9f9f9; padding: 10px; border-right: 5px solid #ccc;">
          ${message || 'طلب التحدث مع موظف'}
        </blockquote>
        <br />
        <p style="font-size: 12px; color: #666;">وصلك هذا التنبيه من نظام KB Chatbot.</p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'KB Chatbot <notifications@resend.dev>', // You should verify your own domain in Resend
        to: [supportEmail],
        subject: subject,
        html: htmlContent,
      }),
    })

    const resData = await res.json()

    if (!res.ok) {
      console.error('Resend API error:', resData)
      throw new Error(`Failed to send email: ${resData.message}`)
    }

    return new Response(JSON.stringify({ success: true, id: resData.id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error('Handover email function error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
