import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    // 1. Ambil payload data user dari Trigger Database
    const { record } = await req.json()
    const userId = record.id
    
    // Ambil metadata dari Google OAuth
    const rawMetadata = record.raw_user_meta_data
    const googleAvatarUrl = rawMetadata?.avatar_url

    // Jika user tidak login pakai Google atau tidak punya avatar, lewati proses
    if (!googleAvatarUrl) {
      return new Response(JSON.stringify({ message: "No Google avatar found" }), { status: 200 })
    }

    // 2. Inisialisasi Supabase Admin Client Internal
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 3. Download gambar dari Google User Content
    const response = await fetch(googleAvatarUrl)
    if (!response.ok) throw new Error("Gagal mendownload gambar dari Google")
    const blob = await response.blob()

    // 4. Upload file gambar ke Storage Bucket 'avatars'
    const fileName = `${userId}/avatar.jpg`
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('avatars')
      .upload(fileName, blob, {
        contentType: 'image/jpeg',
        upsert: true
      })

    if (uploadError) throw uploadError

    // 5. Ambil URL Publik gambar yang baru di-upload
    const { data: { publicUrl } } = supabaseAdmin
      .storage
      .from('avatars')
      .getPublicUrl(fileName)

    // 6. Update kolom avatar_url di tabel profil aplikasi Antum
    // Catatan: Ganti 'profiles' dengan nama tabel user/ustadz publik Antum jika berbeda
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', userId)

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, url: publicUrl }), {
      headers: { "Content-Type": "application/json" },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 400,
    })
  }
})