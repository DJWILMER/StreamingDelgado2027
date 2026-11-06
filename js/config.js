/* ============================================================
   CONFIGURACIÓN DE DJ WILMER
   Edita este archivo para cambiar nombre, eslogan, logo,
   streaming, redes sociales y programación.
   ============================================================ */

window.DJ_WILMER = {
  station: {
    name: 'DJ WILMER',
    slogan: 'DJ WILMER PODER QUE SE SIENTE',
    description: 'Radio online en vivo las 24 horas con la mejor música, mixes y entretenimiento.',
    radio_type: 'Variado',

    /* Identidad visual */
    logo: 'https://i.ibb.co/mhw9LGh/DJ-WILMER-PNG-ORIGINAL.png',
    background: 'https://i.ibb.co/ymBKchrr/LINDA.jpg',
    primary_color: '#FF4500',
    background_color: '#0d0606',

    /* Audio en vivo.
       - audio_streaming_url: stream principal (MP3 / AAC).
       - audio_hls_url: alternativa HLS (.m3u8), se usa si está disponible.
       - radio_url_api: endpoint opcional que devuelve el tema actual. */
    audio_streaming_url: 'https://stream.zeno.fm/zzrxpmz2mv8uv',
    audio_hls_url: '.../hls/live.m3u8',
    radio_url_api: 'https://api.zeno.fm/mounts/metadata/subscribe/zzrxpmz2mv8uv',

    /* Redes sociales.
       IMPORTANTE: estos son datos de ejemplo copiados del reproductor
       original. Reemplázalos por los enlaces oficiales de DJ WILMER.
       Deja una cadena vacía ('') para ocultar ese icono. */
    social_whatsapp: '+51980634177',
    social_instagram: 'https://www.instagram.com/wilmerdelgadocieza',
    social_youtube: 'https://www.youtube.com/@WilmerDelgadoCieza',
    social_web: 'https://wilmerdelgadocieza.blogspot.com',
    social_facebook: ' https://www.facebook.com/DJCHOCHOBARWILMER ',
    social_tiktok: ' https://www.facebook.com/DJCHOCHOBARWILMER',
    social_x: ' https://chat.whatsapp.com/HjONHx6yKRDJsT6LiTwKjF ',
    social_telegram: ' https://t.me/wilmerdelgadoc ',
    social_twitch: ' https://proyectos-pwa-ivory.vercel.app/  ',
    social_tunein: ' https://tunein.com/radio/DJ-WILMER-s330085  ',
    social_radiogarden: ' https://whatsapp.com/channel/0029Van4FAvDjiOb32hAVG0w  ',
    social_donations: '980634177',
    social_email: 'wilmerdelgadocieza@gmail.com',

    /* QR: se genera automáticamente con la URL donde esté publicada la PWA. */
    qr_enabled: true,

    /* Chat en vivo (opcional). Si lo activas, agrega chat_url. */
    chat: false,
    chat_url: ''
  },

  /* Programación semanal de ejemplo.
     day_of_week: monday | tuesday | wednesday | thursday | friday | saturday | sunday
     start_time / end_time: formato 24 h "HH:MM" */
  schedules: [
    {
      day_of_week: 'monday',
      start_time: '10:00',
      end_time: '12:00',
      program_name: 'Buenos días con DJ Wilmer',
      description: 'Música, energía y los mejores éxitos para empezar el día.',
      announcer_name: 'DJ Wilmer',
      announcer_photo_url: ''
    },
    {
      day_of_week: 'tuesday',
      start_time: '10:00',
      end_time: '12:00',
      program_name: 'Buenos días con DJ Wilmer',
      description: 'Música, energía y los mejores éxitos para empezar el día.',
      announcer_name: 'DJ Wilmer',
      announcer_photo_url: ''
    },
    {
      day_of_week: 'wednesday',
      start_time: '10:00',
      end_time: '12:00',
      program_name: 'Buenos días con DJ Wilmer',
      description: 'Música, energía y los mejores éxitos para empezar el día.',
      announcer_name: 'DJ Wilmer',
      announcer_photo_url: ''
    },
    {
      day_of_week: 'thursday',
      start_time: '10:00',
      end_time: '12:00',
      program_name: 'Buenos días con DJ Wilmer',
      description: 'Música, energía y los mejores éxitos para empezar el día.',
      announcer_name: 'DJ Wilmer',
      announcer_photo_url: ''
    },
    {
      day_of_week: 'friday',
      start_time: '18:00',
      end_time: '21:00',
      program_name: 'La Hora del Mix',
      description: 'Los mejores mixes y sesiones para arrancar el fin de semana.',
      announcer_name: 'DJ Wilmer',
      announcer_photo_url: ''
    },
    {
      day_of_week: 'saturday',
      start_time: '20:00',
      end_time: '23:59',
      program_name: 'Sábado de Fiesta',
      description: 'Éxitos, remixes y la mejor energía para tu noche.',
      announcer_name: 'DJ Wilmer',
      announcer_photo_url: ''
    },
    {
      day_of_week: 'sunday',
      start_time: '12:00',
      end_time: '15:00',
      program_name: 'Domingo Relax',
      description: 'Un recorrido tranquilo con clásicos y buena música.',
      announcer_name: 'DJ Wilmer',
      announcer_photo_url: ''
    }
  ]
};
