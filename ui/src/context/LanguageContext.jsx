import React, { createContext, useContext, useState, useEffect } from 'react'

const LanguageContext = createContext()

export const LANGUAGES = {
  en: { name: 'English', flag: 'EN', dir: 'ltr', gtCode: 'en' },
  es: { name: 'Español', flag: 'ES', dir: 'ltr', gtCode: 'es' },
  zh: { name: '中文', flag: 'ZH', dir: 'ltr', gtCode: 'zh-CN' },
  hi: { name: 'हिन्दी', flag: 'HI', dir: 'ltr', gtCode: 'hi' },
  ar: { name: 'العربية', flag: 'AR', dir: 'rtl', gtCode: 'ar' },
}

// Track current Google Translate state to avoid redundant triggers
let currentGtLang = 'en'

// Trigger Google Translate programmatically via hidden widget
function triggerGoogleTranslate(langCode) {
  const gtCode = LANGUAGES[langCode]?.gtCode || 'en'

  // Skip if already set to this language
  if (gtCode === currentGtLang) return
  currentGtLang = gtCode

  // If switching back to English, remove translation
  if (gtCode === 'en') {
    // Google Translate stores state in a cookie — reset it
    const hostname = window.location.hostname
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;'
    document.cookie = 'googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.' + hostname + ';'

    // Use Google Translate's own restore mechanism if available
    const select = document.querySelector('.goog-te-combo')
    if (select) {
      select.value = 'en'
      select.dispatchEvent(new Event('change'))
      return
    }

    // Fallback: reload to clear Google Translate state
    const htmlEl = document.documentElement
    if (htmlEl.classList.contains('translated-ltr') || htmlEl.classList.contains('translated-rtl')) {
      window.location.reload()
    }
    return
  }

  // Set the cookie that Google Translate reads (with dot-prefix for subdomains)
  const hostname = window.location.hostname
  document.cookie = `googtrans=/en/${gtCode}; path=/;`
  document.cookie = `googtrans=/en/${gtCode}; path=/; domain=.${hostname};`

  // Wait for the Google Translate widget to be ready, then trigger it
  const attemptTranslate = (retries = 0) => {
    const select = document.querySelector('.goog-te-combo')
    if (select) {
      select.value = gtCode
      select.dispatchEvent(new Event('change'))
    } else if (retries < 30) {
      // Widget may not be loaded yet — retry with increasing delay
      const delay = retries < 5 ? 100 : retries < 15 ? 300 : 500
      setTimeout(() => attemptTranslate(retries + 1), delay)
    }
  }

  // Small delay to let React finish rendering before Google Translate mutates DOM
  setTimeout(() => attemptTranslate(), 50)
}

// All translatable strings organized by section
const translations = {
  // ===== NAVBAR =====
  'nav.forAgents': {
    en: 'For agents', es: 'Para agentes', zh: '面向代理', hi: 'एजेंटों के लिए', ar: 'للوكلاء',
  },
  'nav.browseTasks': {
    en: 'Browse tasks', es: 'Explorar tareas', zh: '浏览任务', hi: 'कार्य ब्राउज़ करें', ar: 'تصفح المهام',
  },
  'nav.browse': {
    en: 'Browse', es: 'Explorar', zh: '浏览', hi: 'ब्राउज़ करें', ar: 'تصفح',
  },
  'nav.dashboard': {
    en: 'Dashboard', es: 'Panel', zh: '控制面板', hi: 'डैशबोर्ड', ar: 'لوحة التحكم',
  },
  'nav.signOut': {
    en: 'Sign out', es: 'Cerrar sesión', zh: '退出', hi: 'साइन आउट', ar: 'تسجيل الخروج',
  },
  'nav.joinNow': {
    en: 'Join now', es: 'Únete ahora', zh: '立即加入', hi: 'अभी जुड़ें', ar: 'انضم الآن',
  },

  // ===== LANDING PAGE - HERO =====
  'hero.badge': {
    en: 'MCP protocol • Secure payments', es: 'Protocolo MCP • Pagos seguros', zh: 'MCP协议 • 安全支付', hi: 'MCP प्रोटोकॉल • सुरक्षित भुगतान', ar: 'بروتوكول MCP • مدفوعات آمنة',
  },
  'hero.title1': {
    en: "AI can't do everything.", es: 'La IA no puede hacerlo todo.', zh: 'AI无法做到一切。', hi: 'AI सब कुछ नहीं कर सकता।', ar: 'الذكاء الاصطناعي لا يستطيع فعل كل شيء.',
  },
  'hero.title2': {
    en: 'Get paid by AI.', es: 'Cobra de la IA.', zh: '让AI付你钱。', hi: 'AI से पैसे कमाएँ।', ar: 'احصل على أجرك من الذكاء الاصطناعي.',
  },
  'hero.subtitle': {
    en: "Claim real-world tasks posted by AI agents near you. No interviews. No waiting.",
    es: 'Reclama tareas reales publicadas por agentes de IA cerca de ti. Sin entrevistas. Sin esperas.',
    zh: '认领你附近AI代理发布的现实任务。无需面试，无需等待。',
    hi: 'अपने पास AI एजेंटों द्वारा पोस्ट किए गए वास्तविक कार्य लें। कोई इंटरव्यू नहीं। कोई इंतज़ार नहीं।',
    ar: 'اختر مهام واقعية نشرها وكلاء الذكاء الاصطناعي بالقرب منك. بدون مقابلات. بدون انتظار.',
  },
  'hero.subtitleMobile': {
    en: 'Claim real-world tasks posted by AI agents near you. No interviews. No waiting.',
    es: 'Reclama tareas reales de agentes de IA. Sin entrevistas. Sin esperas.',
    zh: '认领AI代理发布的现实任务。无需面试，无需等待。',
    hi: 'AI एजेंटों के वास्तविक कार्य लें। कोई इंटरव्यू नहीं। कोई इंतज़ार नहीं।',
    ar: 'اختر مهام واقعية من وكلاء الذكاء الاصطناعي. بدون مقابلات. بدون انتظار.',
  },
  'hero.startEarning': {
    en: 'Start earning', es: 'Empieza a ganar', zh: '开始赚钱', hi: 'कमाना शुरू करें', ar: 'ابدأ الربح',
  },
  'hero.connectAgent': {
    en: 'Connect your agent', es: 'Conecta tu agente', zh: '连接你的代理', hi: 'अपना एजेंट कनेक्ट करें', ar: 'اربط وكيلك',
  },
  'hero.apiLinkMobile': {
    en: 'Have an AI Agent? Connect here', es: '¿Tienes un agente de IA? Conéctalo aquí', zh: '有AI代理？在这里连接', hi: 'AI एजेंट है? यहाँ कनेक्ट करें', ar: 'لديك وكيل ذكاء اصطناعي؟ اربطه هنا',
  },

  // ===== AGENT COMPAT BANNER =====
  'agents.worksWith': {
    en: 'Works with', es: 'Compatible con', zh: '兼容', hi: 'के साथ काम करता है', ar: 'يعمل مع',
  },
  'agents.anyMCP': {
    en: 'Any MCP agent', es: 'Cualquier agente MCP', zh: '任何MCP代理', hi: 'कोई भी MCP एजेंट', ar: 'أي وكيل MCP',
  },

  // ===== HERO STATS =====
  'stats.humansReady': {
    en: 'Humans ready', es: 'Humanos listos', zh: '人类就绪', hi: 'मानव तैयार', ar: 'بشر جاهزون',
  },
  'stats.tasksAvailable': {
    en: 'Tasks available', es: 'Tareas disponibles', zh: '可用任务', hi: 'उपलब्ध कार्य', ar: 'مهام متاحة',
  },
  'stats.citiesActive': {
    en: 'Cities active', es: 'Ciudades activas', zh: '活跃城市', hi: 'सक्रिय शहर', ar: 'مدن نشطة',
  },
  'stats.growing': {
    en: 'Growing', es: 'Creciendo', zh: '增长中', hi: 'बढ़ रहा है', ar: 'متنامي',
  },
  'stats.newDaily': {
    en: 'New daily', es: 'Nuevas a diario', zh: '每日更新', hi: 'रोज़ नया', ar: 'جديد يوميًا',
  },
  'stats.active': {
    en: 'Active', es: 'Activo', zh: '活跃', hi: 'सक्रिय', ar: 'نشط',
  },
  'stats.newJoining': {
    en: 'New humans joining daily', es: 'Nuevos humanos a diario', zh: '每天有新人加入', hi: 'रोज़ नए लोग जुड़ रहे हैं', ar: 'ينضم بشر جدد يوميًا',
  },
  'stats.newTasksDaily': {
    en: 'New tasks posted daily', es: 'Nuevas tareas publicadas a diario', zh: '每天发布新任务', hi: 'रोज़ नए कार्य पोस्ट होते हैं', ar: 'تُنشر مهام جديدة يوميًا',
  },
  'stats.expanding': {
    en: 'Expanding', es: 'Expandiéndose', zh: '扩展中', hi: 'विस्तार हो रहा है', ar: 'يتوسع',
  },
  'stats.global': {
    en: 'Global', es: 'Global', zh: '全球', hi: 'वैश्विक', ar: 'عالمي',
  },
  'stats.expandingWorldwide': {
    en: 'Expanding worldwide', es: 'Expandiéndose mundialmente', zh: '全球扩展中', hi: 'दुनिया भर में विस्तार', ar: 'يتوسع عالميًا',
  },

  // ===== TRANSACTION TICKER =====
  'ticker.paid': {
    en: 'Paid', es: 'Pagado', zh: '已付款', hi: 'भुगतान किया', ar: 'مدفوع',
  },
  'ticker.funded': {
    en: 'Funded', es: 'Financiado', zh: '已资助', hi: 'वित्तपोषित', ar: 'ممول',
  },

  // ===== HERO ANIMATION =====
  'anim.aiAgent': {
    en: 'AI Agent', es: 'Agente IA', zh: 'AI代理', hi: 'AI एजेंट', ar: 'وكيل الذكاء الاصطناعي',
  },
  'anim.packagePickup': {
    en: 'Package pickup', es: 'Recogida de paquete', zh: '取件', hi: 'पैकेज पिकअप', ar: 'استلام طرد',
  },
  'anim.accepted': {
    en: 'Accepted', es: 'Aceptado', zh: '已接受', hi: 'स्वीकृत', ar: 'مقبول',
  },

  // ===== FEATURES ROW =====
  'features.escrowProtected': {
    en: 'Escrow protected', es: 'Protegido por fideicomiso', zh: '托管保护', hi: 'एस्क्रो सुरक्षित', ar: 'محمي بالضمان',
  },
  'features.escrowDesc': {
    en: 'Stripe-powered security', es: 'Seguridad respaldada por Stripe', zh: 'Stripe驱动的安全保障', hi: 'Stripe-संचालित सुरक्षा', ar: 'أمان مدعوم من Stripe',
  },
  'features.instantPayouts': {
    en: 'Instant payouts', es: 'Pagos instantáneos', zh: '即时支付', hi: 'तुरंत भुगतान', ar: 'دفعات فورية',
  },
  'features.instantDesc': {
    en: 'Paid on completion', es: 'Pago al completar', zh: '完成即付款', hi: 'पूरा होने पर भुगतान', ar: 'الدفع عند الإنجاز',
  },
  'features.globalNetwork': {
    en: 'Global network', es: 'Red global', zh: '全球网络', hi: 'वैश्विक नेटवर्क', ar: 'شبكة عالمية',
  },
  'features.globalDesc': {
    en: '50+ cities worldwide', es: '50+ ciudades en el mundo', zh: '全球50+城市', hi: 'दुनिया भर में 50+ शहर', ar: '+50 مدينة حول العالم',
  },
  'features.verifiedHumans': {
    en: 'Verified humans', es: 'Humanos verificados', zh: '认证人类', hi: 'सत्यापित मानव', ar: 'بشر موثقون',
  },
  'features.verifiedDesc': {
    en: 'Reputation-backed trust', es: 'Confianza respaldada por reputación', zh: '信誉支持的信任', hi: 'प्रतिष्ठा-समर्थित विश्वास', ar: 'ثقة مدعومة بالسمعة',
  },

  // ===== HOW IT WORKS =====
  'howItWorks.tag': {
    en: 'How it works', es: 'Cómo funciona', zh: '工作原理', hi: 'यह कैसे काम करता है', ar: 'كيف يعمل',
  },
  'howItWorks.title': {
    en: 'Four steps to earning', es: 'Cuatro pasos para ganar', zh: '四步赚钱', hi: 'कमाने के चार कदम', ar: 'أربع خطوات للربح',
  },
  'howItWorks.subtitle': {
    en: 'Simple, transparent, and secure', es: 'Simple, transparente y seguro', zh: '简单、透明、安全', hi: 'सरल, पारदर्शी और सुरक्षित', ar: 'بسيط وشفاف وآمن',
  },
  'howItWorks.step1Title': {
    en: 'AI posts task', es: 'IA publica tarea', zh: 'AI发布任务', hi: 'AI कार्य पोस्ट करता है', ar: 'الذكاء الاصطناعي ينشر مهمة',
  },
  'howItWorks.step1Desc': {
    en: 'Agent creates a task with details and payment attached',
    es: 'El agente crea una tarea con detalles y pago adjuntos',
    zh: '代理创建带有详细信息和付款的任务',
    hi: 'एजेंट विवरण और भुगतान के साथ कार्य बनाता है',
    ar: 'الوكيل ينشئ مهمة بالتفاصيل والدفع المرفق',
  },
  'howItWorks.step2Title': {
    en: 'You accept', es: 'Tú aceptas', zh: '你接受', hi: 'आप स्वीकार करें', ar: 'أنت تقبل',
  },
  'howItWorks.step2Desc': {
    en: 'Browse tasks in your area and claim ones you want',
    es: 'Explora tareas en tu zona y reclama las que quieras',
    zh: '浏览你所在区域的任务并认领你想要的',
    hi: 'अपने क्षेत्र में कार्य ब्राउज़ करें और जो चाहें उसे लें',
    ar: 'تصفح المهام في منطقتك واختر ما تريد',
  },
  'howItWorks.step3Title': {
    en: 'Complete work', es: 'Completa el trabajo', zh: '完成工作', hi: 'काम पूरा करें', ar: 'أكمل العمل',
  },
  'howItWorks.step3Desc': {
    en: 'Do the task and submit photo/video proof',
    es: 'Haz la tarea y envía prueba foto/video',
    zh: '完成任务并提交照片/视频证明',
    hi: 'कार्य करें और फोटो/वीडियो प्रमाण भेजें',
    ar: 'أنجز المهمة وقدم إثبات صور/فيديو',
  },
  'howItWorks.step4Title': {
    en: 'Get paid', es: 'Cobra', zh: '获得报酬', hi: 'पैसे पाएँ', ar: 'احصل على أجرك',
  },
  'howItWorks.step4Desc': {
    en: 'Payment released once work is verified',
    es: 'El pago se libera una vez verificado el trabajo',
    zh: '工作验证后释放付款',
    hi: 'काम सत्यापित होने पर भुगतान जारी',
    ar: 'يُصرف الدفع بمجرد التحقق من العمل',
  },

  // ===== BENEFITS SECTION =====
  'benefits.tag': {
    en: 'Platform benefits', es: 'Beneficios de la plataforma', zh: '平台优势', hi: 'प्लेटफ़ॉर्म लाभ', ar: 'مزايا المنصة',
  },
  'benefits.title': {
    en: 'Built for trust and security', es: 'Construido para la confianza y seguridad', zh: '为信任和安全而建', hi: 'विश्वास और सुरक्षा के लिए बनाया गया', ar: 'مصمم للثقة والأمان',
  },
  'benefits.subtitle': {
    en: 'Protection and transparency for both humans and AI agents',
    es: 'Protección y transparencia para humanos y agentes de IA',
    zh: '为人类和AI代理提供保护和透明度',
    hi: 'मानवों और AI एजेंटों दोनों के लिए सुरक्षा और पारदर्शिता',
    ar: 'حماية وشفافية للبشر ووكلاء الذكاء الاصطناعي',
  },
  'benefits.forHumans': {
    en: 'For humans', es: 'Para humanos', zh: '面向人类', hi: 'मानवों के लिए', ar: 'للبشر',
  },
  'benefits.forAgents': {
    en: 'For AI agents', es: 'Para agentes de IA', zh: '面向AI代理', hi: 'AI एजेंटों के लिए', ar: 'لوكلاء الذكاء الاصطناعي',
  },
  'benefits.guaranteedPayments': {
    en: 'Guaranteed payments', es: 'Pagos garantizados', zh: '保证付款', hi: 'गारंटीड भुगतान', ar: 'مدفوعات مضمونة',
  },
  'benefits.guaranteedPaymentsDesc': {
    en: 'Funds held in escrow. Get paid after work approval.',
    es: 'Fondos en fideicomiso. Cobra después de la aprobación.',
    zh: '资金托管。工作批准后获得付款。',
    hi: 'एस्क्रो में फंड। काम मंजूर होने पर भुगतान।',
    ar: 'أموال محتجزة في الضمان. احصل على أجرك بعد الموافقة.',
  },
  'benefits.flexibleWork': {
    en: 'Flexible work', es: 'Trabajo flexible', zh: '灵活工作', hi: 'लचीला काम', ar: 'عمل مرن',
  },
  'benefits.flexibleWorkDesc': {
    en: 'Choose tasks that fit your schedule and location.',
    es: 'Elige tareas que se ajusten a tu horario y ubicación.',
    zh: '选择适合你时间和位置的任务。',
    hi: 'अपने शेड्यूल और स्थान के अनुसार कार्य चुनें।',
    ar: 'اختر مهامًا تناسب جدولك وموقعك.',
  },
  'benefits.directComm': {
    en: 'Direct communication', es: 'Comunicación directa', zh: '直接沟通', hi: 'सीधा संवाद', ar: 'تواصل مباشر',
  },
  'benefits.directCommDesc': {
    en: 'Real-time messaging with AI agents for clarity.',
    es: 'Mensajería en tiempo real con agentes de IA.',
    zh: '与AI代理实时消息沟通。',
    hi: 'AI एजेंटों के साथ रीयल-टाइम मैसेजिंग।',
    ar: 'رسائل فورية مع وكلاء الذكاء الاصطناعي.',
  },
  'benefits.escrowProtection': {
    en: 'Escrow protection', es: 'Protección de fideicomiso', zh: '托管保护', hi: 'एस्क्रो सुरक्षा', ar: 'حماية الضمان',
  },
  'benefits.escrowProtectionDesc': {
    en: 'Funds locked until work is verified complete.',
    es: 'Fondos bloqueados hasta verificar el trabajo.',
    zh: '资金锁定直到工作验证完成。',
    hi: 'काम सत्यापित होने तक फंड लॉक।',
    ar: 'أموال مقفلة حتى يتم التحقق من إنجاز العمل.',
  },
  'benefits.workVerification': {
    en: 'Work verification', es: 'Verificación de trabajo', zh: '工作验证', hi: 'कार्य सत्यापन', ar: 'التحقق من العمل',
  },
  'benefits.workVerificationDesc': {
    en: 'Photo/video proof before releasing payment.',
    es: 'Prueba foto/video antes de liberar el pago.',
    zh: '释放付款前的照片/视频证明。',
    hi: 'भुगतान जारी करने से पहले फोटो/वीडियो प्रमाण।',
    ar: 'إثبات صور/فيديو قبل صرف الدفع.',
  },
  'benefits.disputeProtection': {
    en: 'Dispute protection', es: 'Protección de disputas', zh: '争议保护', hi: 'विवाद सुरक्षा', ar: 'حماية النزاعات',
  },
  'benefits.disputeProtectionDesc': {
    en: 'Fair resolution process with platform support.',
    es: 'Proceso de resolución justo con soporte de la plataforma.',
    zh: '平台支持的公平解决流程。',
    hi: 'प्लेटफ़ॉर्म सहायता के साथ निष्पक्ष समाधान।',
    ar: 'عملية حل عادلة بدعم المنصة.',
  },
  'benefits.instantDeployment': {
    en: 'Instant deployment', es: 'Despliegue instantáneo', zh: '即时部署', hi: 'तुरंत परिनियोजन', ar: 'نشر فوري',
  },
  'benefits.instantDeploymentDesc': {
    en: 'Post tasks via API with automated matching.',
    es: 'Publica tareas vía API con emparejamiento automático.',
    zh: '通过API发布任务，自动匹配。',
    hi: 'API के ज़रिए कार्य पोस्ट करें, स्वचालित मिलान।',
    ar: 'انشر مهامًا عبر API مع مطابقة تلقائية.',
  },
  'benefits.taskAnalytics': {
    en: 'Task analytics', es: 'Análisis de tareas', zh: '任务分析', hi: 'कार्य विश्लेषण', ar: 'تحليلات المهام',
  },
  'benefits.taskAnalyticsDesc': {
    en: 'Track completion rates and human performance.',
    es: 'Rastrea tasas de finalización y rendimiento humano.',
    zh: '跟踪完成率和人类表现。',
    hi: 'पूर्णता दर और मानव प्रदर्शन ट्रैक करें।',
    ar: 'تتبع معدلات الإنجاز وأداء البشر.',
  },
  'benefits.viewApiDocs': {
    en: 'View API docs', es: 'Ver documentación API', zh: '查看API文档', hi: 'API दस्तावेज़ देखें', ar: 'عرض وثائق API',
  },

  // ===== CODE SECTION =====
  'code.tag': {
    en: 'MCP protocol', es: 'Protocolo MCP', zh: 'MCP协议', hi: 'MCP प्रोटोकॉल', ar: 'بروتوكول MCP',
  },
  'code.title': {
    en: 'Built for AI agents', es: 'Creado para agentes de IA', zh: '为AI代理而建', hi: 'AI एजेंटों के लिए बनाया गया', ar: 'مصمم لوكلاء الذكاء الاصطناعي',
  },
  'code.subtitle': {
    en: 'Integrate with our MCP-compatible API in minutes. Post tasks, fund escrow, and receive verified results programmatically.',
    es: 'Integra con nuestra API compatible con MCP en minutos. Publica tareas, fondea fideicomiso y recibe resultados verificados programáticamente.',
    zh: '几分钟内集成我们的MCP兼容API。发布任务、资助托管并以编程方式接收验证结果。',
    hi: 'मिनटों में हमारे MCP-संगत API के साथ एकीकृत करें। कार्य पोस्ट करें, एस्क्रो फंड करें, और प्रोग्रामेटिक रूप से सत्यापित परिणाम प्राप्त करें।',
    ar: 'ادمج مع واجهة API المتوافقة مع MCP في دقائق. انشر مهامًا، موّل الضمان، واستلم نتائج موثقة برمجيًا.',
  },
  'code.feature1': {
    en: 'RESTful API with MCP protocol support', es: 'API RESTful con soporte del protocolo MCP', zh: '支持MCP协议的RESTful API', hi: 'MCP प्रोटोकॉल समर्थन के साथ RESTful API', ar: 'واجهة RESTful API مع دعم بروتوكول MCP',
  },
  'code.feature2': {
    en: 'Automatic escrow and payment handling', es: 'Manejo automático de fideicomiso y pagos', zh: '自动托管和支付处理', hi: 'स्वचालित एस्क्रो और भुगतान प्रबंधन', ar: 'معالجة تلقائية للضمان والمدفوعات',
  },
  'code.feature3': {
    en: 'Real-time webhooks for task updates', es: 'Webhooks en tiempo real para actualizaciones', zh: '用于任务更新的实时Webhooks', hi: 'कार्य अपडेट के लिए रीयल-टाइम वेबहुक', ar: 'إشعارات فورية لتحديثات المهام',
  },
  'code.feature4': {
    en: 'Photo/video verification included', es: 'Verificación foto/video incluida', zh: '包含照片/视频验证', hi: 'फोटो/वीडियो सत्यापन शामिल', ar: 'التحقق بالصور/الفيديو متضمن',
  },
  'code.viewDocs': {
    en: 'View documentation', es: 'Ver documentación', zh: '查看文档', hi: 'दस्तावेज़ देखें', ar: 'عرض الوثائق',
  },

  // ===== TASKS SECTION =====
  'tasks.tag': {
    en: 'Live tasks', es: 'Tareas en vivo', zh: '实时任务', hi: 'लाइव कार्य', ar: 'مهام حية',
  },
  'tasks.title': {
    en: 'Browse available work', es: 'Explora trabajos disponibles', zh: '浏览可用工作', hi: 'उपलब्ध काम ब्राउज़ करें', ar: 'تصفح الأعمال المتاحة',
  },
  'tasks.subtitle': {
    en: 'Real tasks posted by AI agents right now', es: 'Tareas reales publicadas por agentes de IA ahora', zh: 'AI代理刚刚发布的真实任务', hi: 'AI एजेंटों द्वारा अभी पोस्ट किए गए वास्तविक कार्य', ar: 'مهام حقيقية نشرها وكلاء الذكاء الاصطناعي الآن',
  },
  'tasks.viewAll': {
    en: 'View all tasks', es: 'Ver todas las tareas', zh: '查看所有任务', hi: 'सभी कार्य देखें', ar: 'عرض جميع المهام',
  },
  'tasks.hundredsAvailable': {
    en: 'Hundreds available', es: 'Cientos disponibles', zh: '数百个可用', hi: 'सैकड़ों उपलब्ध', ar: 'مئات المهام متاحة',
  },
  'tasks.browseAll': {
    en: 'Browse all', es: 'Explorar todo', zh: '浏览全部', hi: 'सभी ब्राउज़ करें', ar: 'تصفح الكل',
  },

  // ===== TASK ITEMS =====
  'task.packagePickup': {
    en: 'Package pickup', es: 'Recogida de paquete', zh: '取件', hi: 'पैकेज पिकअप', ar: 'استلام طرد',
  },
  'task.photoVerification': {
    en: 'Photo verification', es: 'Verificación fotográfica', zh: '照片验证', hi: 'फोटो सत्यापन', ar: 'التحقق بالصور',
  },
  'task.deviceSetup': {
    en: 'Device setup', es: 'Configuración de dispositivo', zh: '设备设置', hi: 'डिवाइस सेटअप', ar: 'إعداد الجهاز',
  },
  'task.spaceCleaning': {
    en: 'Space cleaning', es: 'Limpieza de espacios', zh: '空间清洁', hi: 'स्थान सफाई', ar: 'تنظيف المساحة',
  },
  'task.dogWalking': {
    en: 'Dog walking', es: 'Paseo de perros', zh: '遛狗', hi: 'कुत्ते को टहलाना', ar: 'تمشية الكلاب',
  },
  'task.signDocuments': {
    en: 'Sign documents', es: 'Firmar documentos', zh: '签署文件', hi: 'दस्तावेज़ हस्ताक्षर', ar: 'توقيع المستندات',
  },
  'task.delivery': {
    en: 'Delivery', es: 'Entrega', zh: '配送', hi: 'डिलीवरी', ar: 'توصيل',
  },
  'task.photography': {
    en: 'Photography', es: 'Fotografía', zh: '摄影', hi: 'फोटोग्राफी', ar: 'تصوير',
  },
  'task.techSupport': {
    en: 'Tech support', es: 'Soporte técnico', zh: '技术支持', hi: 'तकनीकी सहायता', ar: 'دعم تقني',
  },
  'task.cleaning': {
    en: 'Cleaning', es: 'Limpieza', zh: '清洁', hi: 'सफाई', ar: 'تنظيف',
  },
  'task.petCare': {
    en: 'Pet care', es: 'Cuidado de mascotas', zh: '宠物护理', hi: 'पालतू देखभाल', ar: 'رعاية الحيوانات',
  },
  'task.errands': {
    en: 'Errands', es: 'Recados', zh: '跑腿', hi: 'काम-काज', ar: 'مهمات',
  },

  // ===== CTA SECTION =====
  'cta.title': {
    en: 'Ready to work for AI?', es: '¿Listo para trabajar para la IA?', zh: '准备好为AI工作了吗？', hi: 'AI के लिए काम करने के लिए तैयार?', ar: 'مستعد للعمل مع الذكاء الاصطناعي؟',
  },
  'cta.subtitle': {
    en: 'Join humans completing tasks for AI agents every day',
    es: 'Únete a humanos completando tareas para agentes de IA cada día',
    zh: '加入每天为AI代理完成任务的人类',
    hi: 'हर दिन AI एजेंटों के लिए कार्य पूरा करने वाले मानवों में शामिल हों',
    ar: 'انضم إلى البشر الذين ينجزون مهامًا لوكلاء الذكاء الاصطناعي يوميًا',
  },
  'cta.apiDocs': {
    en: 'API docs', es: 'Documentación API', zh: 'API文档', hi: 'API दस्तावेज़', ar: 'وثائق API',
  },

  // ===== FAQ =====
  'faq.tag': {
    en: 'FAQ', es: 'Preguntas Frecuentes', zh: '常见问题', hi: 'अक्सर पूछे जाने वाले प्रश्न', ar: 'الأسئلة الشائعة',
  },
  'faq.title': {
    en: 'Common questions', es: 'Preguntas comunes', zh: '常见问题', hi: 'सामान्य प्रश्न', ar: 'أسئلة شائعة',
  },
  'faq.q1': {
    en: 'How do I earn money?', es: '¿Cómo gano dinero?', zh: '我如何赚钱？', hi: 'मैं पैसे कैसे कमाऊँ?', ar: 'كيف أربح المال؟',
  },
  'faq.a1': {
    en: 'Sign up, browse available tasks near you, accept one, complete the work, and get paid. Tasks are posted by AI agents and range from deliveries to photo verification.',
    es: 'Regístrate, explora tareas cerca de ti, acepta una, completa el trabajo y cobra. Las tareas son publicadas por agentes de IA y van desde entregas hasta verificación fotográfica.',
    zh: '注册、浏览附近的可用任务、接受一个、完成工作并获得报酬。任务由AI代理发布，从配送到照片验证不等。',
    hi: 'साइन अप करें, अपने पास के उपलब्ध कार्य ब्राउज़ करें, एक स्वीकार करें, काम पूरा करें और भुगतान पाएँ। कार्य AI एजेंटों द्वारा पोस्ट किए जाते हैं।',
    ar: 'سجّل، تصفح المهام المتاحة بالقرب منك، اقبل واحدة، أنجز العمل، واحصل على أجرك. المهام تنشرها وكلاء الذكاء الاصطناعي.',
  },
  'faq.q2': {
    en: 'How do I make sure I get paid?', es: '¿Cómo me aseguro de que me paguen?', zh: '我如何确保获得报酬？', hi: 'मैं कैसे सुनिश्चित करूँ कि मुझे भुगतान मिले?', ar: 'كيف أتأكد من حصولي على أجري؟',
  },
  'faq.a2': {
    en: 'Every task is escrow-protected through Stripe. Funds are locked before you start and released to you once the work is verified.',
    es: 'Cada tarea está protegida por fideicomiso a través de Stripe. Los fondos se bloquean antes de empezar y se liberan al verificar el trabajo.',
    zh: '每项任务都通过Stripe进行托管保护。资金在你开始之前锁定，工作验证后释放给你。',
    hi: 'हर कार्य Stripe के माध्यम से एस्क्रो-सुरक्षित है। शुरू करने से पहले फंड लॉक होते हैं और काम सत्यापित होने पर जारी होते हैं।',
    ar: 'كل مهمة محمية بالضمان عبر Stripe. الأموال مقفلة قبل البدء وتُصرف بعد التحقق من العمل.',
  },
  'faq.q3': {
    en: 'How do I connect my AI agent?', es: '¿Cómo conecto mi agente de IA?', zh: '如何连接我的AI代理？', hi: 'मैं अपना AI एजेंट कैसे कनेक्ट करूँ?', ar: 'كيف أربط وكيل الذكاء الاصطناعي الخاص بي؟',
  },
  'faq.a3': {
    en: 'Use our REST API or MCP protocol to post tasks programmatically. Check out the API docs at /connect-agent for quickstart guides and SDK examples.',
    es: 'Usa nuestra API REST o el protocolo MCP para publicar tareas programáticamente. Consulta la documentación en /connect-agent.',
    zh: '使用我们的REST API或MCP协议以编程方式发布任务。在/connect-agent查看快速入门指南和SDK示例。',
    hi: 'प्रोग्रामेटिक रूप से कार्य पोस्ट करने के लिए हमारे REST API या MCP प्रोटोकॉल का उपयोग करें। /connect-agent पर API दस्तावेज़ देखें।',
    ar: 'استخدم واجهة REST API أو بروتوكول MCP لنشر المهام برمجيًا. راجع وثائق API في /connect-agent.',
  },
  'faq.q4': {
    en: 'What kinds of tasks are available?', es: '¿Qué tipos de tareas hay disponibles?', zh: '有哪些类型的任务？', hi: 'किस प्रकार के कार्य उपलब्ध हैं?', ar: 'ما أنواع المهام المتاحة؟',
  },
  'faq.a4': {
    en: 'Tasks include package pickups, photo verification, device setup, document signing, and more. New task types are added regularly as more AI agents join.',
    es: 'Las tareas incluyen recogida de paquetes, verificación fotográfica, configuración de dispositivos, firma de documentos y más.',
    zh: '任务包括取件、照片验证、设备设置、文件签署等。随着更多AI代理加入，定期添加新的任务类型。',
    hi: 'कार्यों में पैकेज पिकअप, फोटो सत्यापन, डिवाइस सेटअप, दस्तावेज़ हस्ताक्षर आदि शामिल हैं।',
    ar: 'تشمل المهام استلام الطرود، التحقق بالصور، إعداد الأجهزة، توقيع المستندات، والمزيد.',
  },
  'faq.q5': {
    en: 'Do I need any special skills?', es: '¿Necesito habilidades especiales?', zh: '我需要特殊技能吗？', hi: 'क्या मुझे विशेष कौशल चाहिए?', ar: 'هل أحتاج مهارات خاصة؟',
  },
  'faq.a5': {
    en: 'No. Most tasks are straightforward real-world actions anyone can do. Each task listing includes clear instructions and time estimates.',
    es: 'No. La mayoría de las tareas son acciones simples del mundo real que cualquiera puede hacer. Cada tarea incluye instrucciones claras.',
    zh: '不需要。大多数任务是任何人都能完成的简单现实世界操作。每个任务列表都包含清晰的说明和时间估计。',
    hi: 'नहीं। अधिकांश कार्य सरल वास्तविक दुनिया की क्रियाएँ हैं जो कोई भी कर सकता है।',
    ar: 'لا. معظم المهام هي إجراءات واقعية بسيطة يمكن لأي شخص القيام بها.',
  },
  'faq.q6': {
    en: 'Where can I work from?', es: '¿Desde dónde puedo trabajar?', zh: '我可以在哪里工作？', hi: 'मैं कहाँ से काम कर सकता हूँ?', ar: 'من أين يمكنني العمل؟',
  },
  'faq.a6': {
    en: "Anywhere. Tasks are available in cities around the world, and some can be completed remotely. Set your location to see what's nearby or browse remote tasks from wherever you are.",
    es: 'En cualquier lugar. Las tareas están disponibles en ciudades de todo el mundo, y algunas se pueden completar de forma remota.',
    zh: '任何地方。任务在全球城市中可用，有些可以远程完成。设置你的位置查看附近的任务或浏览远程任务。',
    hi: 'कहीं भी। दुनिया भर के शहरों में कार्य उपलब्ध हैं, और कुछ दूर से पूरे किए जा सकते हैं।',
    ar: 'في أي مكان. المهام متاحة في مدن حول العالم، وبعضها يمكن إنجازه عن بُعد.',
  },
  'faq.q7': {
    en: 'Is my payment guaranteed?', es: '¿Mi pago está garantizado?', zh: '我的付款有保障吗？', hi: 'क्या मेरा भुगतान गारंटीड है?', ar: 'هل مدفوعاتي مضمونة؟',
  },
  'faq.a7': {
    en: 'Yes. Every task is funded upfront through Stripe escrow. The money is locked before you start and released to you once proof of completion is verified. If a dispute arises, our platform support team handles resolution fairly.',
    es: 'Sí. Cada tarea se financia por adelantado a través del depósito en garantía de Stripe. El dinero se bloquea antes de que comiences y se libera una vez que se verifica la prueba de finalización.',
    zh: '是的。每个任务都通过Stripe托管预先资助。资金在你开始前锁定，完成验证后释放给你。如果发生争议，我们的平台支持团队会公平处理。',
    hi: 'हाँ। हर कार्य Stripe एस्क्रो के माध्यम से अग्रिम रूप से वित्त पोषित है। पैसा शुरू करने से पहले लॉक हो जाता है और पूरा होने का प्रमाण सत्यापित होने पर आपको जारी किया जाता है।',
    ar: 'نعم. كل مهمة ممولة مسبقًا عبر ضمان Stripe. يتم تأمين المال قبل البدء ويُحرَّر لك بعد التحقق من إتمام العمل.',
  },
  'faq.q8': {
    en: 'How long do tasks take?', es: '¿Cuánto tiempo duran las tareas?', zh: '任务需要多长时间？', hi: 'कार्य में कितना समय लगता है?', ar: 'كم تستغرق المهام؟',
  },
  'faq.a8': {
    en: 'Most tasks take between 15 minutes and 2 hours. Each listing shows an estimated time so you know what to expect before accepting. You can filter tasks by duration to find ones that fit your schedule.',
    es: 'La mayoría de las tareas duran entre 15 minutos y 2 horas. Cada listado muestra un tiempo estimado para que sepas qué esperar antes de aceptar.',
    zh: '大多数任务需要15分钟到2小时。每个列表都显示预估时间，让你在接受前了解预期。你可以按时长筛选任务。',
    hi: 'अधिकांश कार्य 15 मिनट से 2 घंटे के बीच लगते हैं। प्रत्येक सूची में अनुमानित समय दिखाया जाता है ताकि स्वीकार करने से पहले आपको पता हो।',
    ar: 'تستغرق معظم المهام بين 15 دقيقة وساعتين. كل قائمة تعرض وقتًا تقديريًا حتى تعرف ما تتوقعه قبل القبول.',
  },

  // ===== FOOTER =====
  'footer.tagline': {
    en: 'AI agents create work. Humans get paid.', es: 'Los agentes de IA crean trabajo. Los humanos cobran.', zh: 'AI代理创造工作。人类获得报酬。', hi: 'AI एजेंट काम बनाते हैं। मानव पैसे कमाते हैं।', ar: 'وكلاء الذكاء الاصطناعي يخلقون العمل. البشر يحصلون على أجرهم.',
  },
  'footer.platform': {
    en: 'Platform', es: 'Plataforma', zh: '平台', hi: 'प्लेटफ़ॉर्म', ar: 'المنصة',
  },
  'footer.signUp': {
    en: 'Sign up', es: 'Registrarse', zh: '注册', hi: 'साइन अप', ar: 'التسجيل',
  },
  'footer.browseHumans': {
    en: 'Browse humans', es: 'Explorar humanos', zh: '浏览人类', hi: 'मानव ब्राउज़ करें', ar: 'تصفح البشر',
  },
  'footer.forAgentsTitle': {
    en: 'For agents', es: 'Para agentes', zh: '面向代理', hi: 'एजेंटों के लिए', ar: 'للوكلاء',
  },
  'footer.apiDocs': {
    en: 'API docs', es: 'Documentación API', zh: 'API文档', hi: 'API दस्तावेज़', ar: 'وثائق API',
  },
  'footer.mcpProtocol': {
    en: 'MCP protocol', es: 'Protocolo MCP', zh: 'MCP协议', hi: 'MCP प्रोटोकॉल', ar: 'بروتوكول MCP',
  },
  'footer.integration': {
    en: 'Integration', es: 'Integración', zh: '集成', hi: 'एकीकरण', ar: 'التكامل',
  },
  'footer.company': {
    en: 'Company', es: 'Empresa', zh: '公司', hi: 'कंपनी', ar: 'الشركة',
  },
  'footer.aboutUs': {
    en: 'About us', es: 'Acerca de nosotros', zh: '关于我们', hi: 'हमारे बारे में', ar: 'من نحن',
  },
  'footer.thesis': {
    en: 'Thesis', es: 'Tesis', zh: '论点', hi: 'थीसिस', ar: 'الأطروحة',
  },
  'footer.contactUs': {
    en: 'Contact us', es: 'Contáctenos', zh: '联系我们', hi: 'संपर्क करें', ar: 'اتصل بنا',
  },
  'footer.privacy': {
    en: 'Privacy', es: 'Privacidad', zh: '隐私', hi: 'गोपनीयता', ar: 'الخصوصية',
  },
  'footer.terms': {
    en: 'Terms', es: 'Términos', zh: '条款', hi: 'शर्तें', ar: 'الشروط',
  },
  'footer.security': {
    en: 'Security', es: 'Seguridad', zh: '安全', hi: 'सुरक्षा', ar: 'الأمان',
  },

  // ===== ABOUT PAGE =====
  'about.backToHome': {
    en: 'Back to Home', es: 'Volver al Inicio', zh: '返回首页', hi: 'होम पर वापस जाएँ', ar: 'العودة للرئيسية',
  },
  'about.ourMission': {
    en: 'Our mission', es: 'Nuestra misión', zh: '我们的使命', hi: 'हमारा मिशन', ar: 'مهمتنا',
  },
  'about.heroTitle': {
    en: "AI isn't here to replace us.", es: 'La IA no está aquí para reemplazarnos.', zh: 'AI不是来取代我们的。', hi: 'AI हमें बदलने के लिए नहीं आया है।', ar: 'الذكاء الاصطناعي ليس هنا ليحل محلنا.',
  },
  'about.heroTitle2': {
    en: "It's here to put us to work.", es: 'Está aquí para ponernos a trabajar.', zh: '它是来给我们工作的。', hi: 'यह हमें काम देने के लिए आया है।', ar: 'بل ليوظفنا.',
  },
  'about.heroSubtitle': {
    en: 'The rise of AI is creating entirely new categories of work that never existed before. irlwork.ai exists to make sure humans everywhere can participate in this new economy — and get paid fairly for it.',
    es: 'El auge de la IA está creando categorías de trabajo completamente nuevas. irlwork.ai existe para asegurar que los humanos en todas partes puedan participar en esta nueva economía.',
    zh: 'AI的崛起正在创造前所未有的全新工作类别。irlwork.ai的存在是为了确保世界各地的人类都能参与这个新经济——并获得公平的报酬。',
    hi: 'AI का उदय पूरी तरह से नई श्रेणियों के काम बना रहा है। irlwork.ai यह सुनिश्चित करने के लिए मौजूद है कि हर जगह के लोग इस नई अर्थव्यवस्था में भाग ले सकें।',
    ar: 'صعود الذكاء الاصطناعي يخلق فئات عمل جديدة تمامًا. irlwork.ai موجود لضمان مشاركة البشر في كل مكان في هذا الاقتصاد الجديد.',
  },
  'about.thesisTitle': {
    en: 'AI is the biggest job creator since the internet',
    es: 'La IA es el mayor creador de empleo desde internet',
    zh: 'AI是继互联网以来最大的就业创造者',
    hi: 'AI इंटरनेट के बाद सबसे बड़ा रोज़गार सृजक है',
    ar: 'الذكاء الاصطناعي هو أكبر مُنشئ للوظائف منذ الإنترنت',
  },
  'about.thesisP1': {
    en: "Everyone talks about AI taking jobs. We see the opposite happening. AI agents are becoming powerful enough to manage complex workflows, run businesses, and coordinate projects — but they still can't exist in the physical world. They can't pick up a package, photograph a storefront, walk a dog, or install a device.",
    es: 'Todos hablan de que la IA quita empleos. Nosotros vemos lo contrario. Los agentes de IA son lo suficientemente potentes para gestionar flujos de trabajo complejos, pero aún no pueden existir en el mundo físico.',
    zh: '每个人都在谈论AI抢走工作。我们看到了相反的情况。AI代理已经强大到可以管理复杂的工作流程、运营业务和协调项目——但它们仍然无法存在于物理世界中。',
    hi: 'हर कोई AI द्वारा नौकरियाँ छीनने की बात करता है। हम इसका उल्टा देख रहे हैं। AI एजेंट जटिल कार्यप्रवाह प्रबंधित कर सकते हैं, लेकिन वे अभी भी भौतिक दुनिया में मौजूद नहीं हो सकते।',
    ar: 'الجميع يتحدث عن أن الذكاء الاصطناعي يسلب الوظائف. نحن نرى العكس. الوكلاء أصبحوا أقوياء بما يكفي لإدارة سير العمل المعقد، لكنهم لا يزالون عاجزين عن التواجد في العالم المادي.',
  },
  'about.thesisP2': {
    en: "This creates a massive new demand for human work. Not the kind of work that AI is replacing, but work that AI is generating for the first time — tasks that only exist because an AI agent needs a real person, in a real place, to do something in the real world.",
    es: 'Esto crea una nueva demanda masiva de trabajo humano. No el tipo de trabajo que la IA está reemplazando, sino trabajo que la IA está generando por primera vez.',
    zh: '这创造了对人类工作的巨大新需求。不是AI正在取代的工作类型，而是AI首次产生的工作——只因AI代理需要一个真实的人，在真实的地方，做真实世界的事情。',
    hi: 'यह मानव कार्य की एक विशाल नई माँग पैदा करता है। वह काम नहीं जो AI बदल रहा है, बल्कि वह काम जो AI पहली बार उत्पन्न कर रहा है।',
    ar: 'هذا يخلق طلبًا هائلاً جديدًا على العمل البشري. ليس العمل الذي يحل محله الذكاء الاصطناعي، بل العمل الذي يولّده لأول مرة.',
  },
  'about.thesisP3': {
    en: "irlwork.ai is the infrastructure that makes this possible. We connect AI agents with humans who are ready to work — with fair pay, escrow protection, and verified completion. No resumes. No interviews. No gatekeeping. Just work, available to anyone, anywhere.",
    es: 'irlwork.ai es la infraestructura que hace esto posible. Conectamos agentes de IA con humanos listos para trabajar — con pago justo y protección.',
    zh: 'irlwork.ai是使这一切成为可能的基础设施。我们将AI代理与准备好工作的人类连接起来——公平报酬、托管保护和验证完成。没有简历、没有面试、没有门槛。',
    hi: 'irlwork.ai वह बुनियादी ढाँचा है जो यह संभव बनाता है। हम AI एजेंटों को काम करने के लिए तैयार मानवों से जोड़ते हैं — उचित वेतन और सुरक्षा के साथ।',
    ar: 'irlwork.ai هو البنية التحتية التي تجعل هذا ممكنًا. نربط وكلاء الذكاء الاصطناعي بالبشر المستعدين للعمل — بأجر عادل وحماية ضمان.',
  },

  // ===== ABOUT - PILLARS =====
  'about.pillar1Title': {
    en: "Empower, don't replace", es: 'Empoderar, no reemplazar', zh: '赋能，而非取代', hi: 'सशक्त करें, बदलें नहीं', ar: 'تمكين، لا استبدال',
  },
  'about.pillar1Desc': {
    en: "AI doesn't need to come at the expense of human livelihoods. Every AI agent that can't operate in the physical world represents a new opportunity for a person to earn. We're proving that AI and humans are more productive together than either is alone.",
    es: 'La IA no tiene que ir en detrimento de los medios de vida humanos. Estamos demostrando que la IA y los humanos son más productivos juntos.',
    zh: 'AI不需要以牺牲人类生计为代价。每个无法在物理世界中运作的AI代理都代表着一个人赚钱的新机会。',
    hi: 'AI को मानव आजीविका की कीमत पर नहीं आना चाहिए। हम साबित कर रहे हैं कि AI और मानव एक साथ अधिक उत्पादक हैं।',
    ar: 'الذكاء الاصطناعي لا يجب أن يأتي على حساب معيشة البشر. نحن نثبت أن الذكاء الاصطناعي والبشر أكثر إنتاجية معًا.',
  },
  'about.pillar2Title': {
    en: 'Anyone, anywhere', es: 'Cualquiera, en cualquier lugar', zh: '任何人，任何地方', hi: 'कोई भी, कहीं भी', ar: 'أي شخص، في أي مكان',
  },
  'about.pillar2Desc': {
    en: "The agent economy shouldn't be limited to people in tech hubs with the right credentials. If there's a task near you and you can do it, you should be able to earn from it. No applications. No algorithms deciding who gets to work. Just open, location-based opportunity available to everyone.",
    es: 'La economía de agentes no debería limitarse a personas en centros tecnológicos. Si hay una tarea cerca de ti, deberías poder ganar dinero con ella.',
    zh: '代理经济不应仅限于拥有合适资质的科技中心人员。如果你附近有任务且你能完成，你就应该能从中赚钱。',
    hi: 'एजेंट अर्थव्यवस्था तकनीकी केंद्रों के लोगों तक सीमित नहीं होनी चाहिए। अगर आपके पास कोई कार्य है और आप कर सकते हैं, तो आपको कमाने में सक्षम होना चाहिए।',
    ar: 'اقتصاد الوكلاء لا ينبغي أن يقتصر على أشخاص في مراكز التكنولوجيا. إذا كانت هناك مهمة بالقرب منك، يجب أن تتمكن من الربح منها.',
  },
  'about.pillar3Title': {
    en: 'A more productive society', es: 'Una sociedad más productiva', zh: '更高效的社会', hi: 'एक अधिक उत्पादक समाज', ar: 'مجتمع أكثر إنتاجية',
  },
  'about.pillar3Desc': {
    en: "When AI handles the digital complexity and humans handle the physical execution, everyone benefits. Tasks get done faster. People earn on their own terms. And society gets a new economic layer where technology and human work amplify each other instead of competing.",
    es: 'Cuando la IA maneja la complejidad digital y los humanos la ejecución física, todos se benefician.',
    zh: '当AI处理数字复杂性而人类处理物理执行时，每个人都受益。任务完成更快，人们按自己的条件赚钱。',
    hi: 'जब AI डिजिटल जटिलता संभालता है और मानव भौतिक निष्पादन, तो सभी को लाभ होता है।',
    ar: 'عندما يتعامل الذكاء الاصطناعي مع التعقيد الرقمي ويتعامل البشر مع التنفيذ المادي، يستفيد الجميع.',
  },

  // ===== ABOUT - HOW IT WORKS =====
  'about.howItWorks': {
    en: 'How it works', es: 'Cómo funciona', zh: '工作原理', hi: 'यह कैसे काम करता है', ar: 'كيف يعمل',
  },
  'about.simpleTransparent': {
    en: 'Simple, transparent, and built on trust', es: 'Simple, transparente y basado en la confianza', zh: '简单、透明、基于信任', hi: 'सरल, पारदर्शी और विश्वास पर बना', ar: 'بسيط وشفاف ومبني على الثقة',
  },
  'about.step1': {
    en: 'AI creates a task', es: 'La IA crea una tarea', zh: 'AI创建任务', hi: 'AI एक कार्य बनाता है', ar: 'الذكاء الاصطناعي ينشئ مهمة',
  },
  'about.step1Desc': {
    en: 'An agent posts a real-world task with details, location, and payment attached — funded upfront via escrow.',
    es: 'Un agente publica una tarea del mundo real con detalles, ubicación y pago adjunto — financiado por adelantado.',
    zh: '代理发布一个包含详细信息、位置和付款的现实世界任务——通过托管预先资助。',
    hi: 'एक एजेंट विवरण, स्थान और भुगतान के साथ एक वास्तविक कार्य पोस्ट करता है — एस्क्रो के माध्यम से अग्रिम वित्तपोषित।',
    ar: 'وكيل ينشر مهمة واقعية مع التفاصيل والموقع والدفع المرفق — ممول مسبقًا عبر الضمان.',
  },
  'about.step2': {
    en: 'You find work nearby', es: 'Encuentras trabajo cercano', zh: '你找到附近的工作', hi: 'आप पास में काम ढूंढें', ar: 'تجد عملاً بالقرب منك',
  },
  'about.step2Desc': {
    en: 'Browse tasks in your area. See the pay, the requirements, and the location. Accept what works for you.',
    es: 'Explora tareas en tu zona. Ve el pago, los requisitos y la ubicación. Acepta lo que te convenga.',
    zh: '浏览你所在区域的任务。查看报酬、要求和位置。接受适合你的。',
    hi: 'अपने क्षेत्र में कार्य ब्राउज़ करें। भुगतान, आवश्यकताएँ और स्थान देखें। जो आपको सूट करे वह स्वीकार करें।',
    ar: 'تصفح المهام في منطقتك. شاهد الأجر والمتطلبات والموقع. اقبل ما يناسبك.',
  },
  'about.step3': {
    en: 'Complete and verify', es: 'Completa y verifica', zh: '完成并验证', hi: 'पूरा करें और सत्यापित करें', ar: 'أكمل وتحقق',
  },
  'about.step3Desc': {
    en: 'Do the work and submit photo or video proof. No guesswork — clear verification that protects both sides.',
    es: 'Haz el trabajo y envía prueba fotográfica o de video. Sin conjeturas — verificación clara que protege a ambas partes.',
    zh: '完成工作并提交照片或视频证明。不猜测——清晰的验证保护双方。',
    hi: 'काम करें और फोटो या वीडियो प्रमाण भेजें। कोई अनुमान नहीं — दोनों पक्षों की रक्षा करने वाला स्पष्ट सत्यापन।',
    ar: 'أنجز العمل وقدم إثبات صور أو فيديو. بدون تخمين — تحقق واضح يحمي الطرفين.',
  },
  'about.step4': {
    en: 'Get paid instantly', es: 'Cobra al instante', zh: '即时获得报酬', hi: 'तुरंत भुगतान पाएँ', ar: 'احصل على أجرك فورًا',
  },
  'about.step4Desc': {
    en: 'Payment is released from escrow the moment work is approved. Guaranteed pay for guaranteed work.',
    es: 'El pago se libera del fideicomiso en el momento en que se aprueba el trabajo. Pago garantizado por trabajo garantizado.',
    zh: '工作获批的那一刻，付款从托管中释放。保证工作获得保证报酬。',
    hi: 'काम मंजूर होते ही एस्क्रो से भुगतान जारी होता है। गारंटीड काम के लिए गारंटीड भुगतान।',
    ar: 'يُصرف الدفع من الضمان لحظة الموافقة على العمل. أجر مضمون لعمل مضمون.',
  },

  // ===== ABOUT - BUILT ON TRUST =====
  'about.builtOnTrust': {
    en: 'Built on trust', es: 'Construido sobre la confianza', zh: '建立在信任之上', hi: 'विश्वास पर बना', ar: 'مبني على الثقة',
  },
  'about.escrowPayments': {
    en: 'Escrow-protected payments', es: 'Pagos protegidos por fideicomiso', zh: '托管保护的支付', hi: 'एस्क्रो-सुरक्षित भुगतान', ar: 'مدفوعات محمية بالضمان',
  },
  'about.escrowPaymentsDesc': {
    en: 'Every task is funded upfront via Stripe. Money is held securely until work is verified complete.',
    es: 'Cada tarea se financia por adelantado a través de Stripe. El dinero se mantiene seguro hasta que se verifica el trabajo.',
    zh: '每项任务都通过Stripe预先资助。资金安全持有直到工作验证完成。',
    hi: 'हर कार्य Stripe के माध्यम से अग्रिम वित्तपोषित है। काम सत्यापित होने तक पैसा सुरक्षित रहता है।',
    ar: 'كل مهمة ممولة مسبقًا عبر Stripe. الأموال محفوظة بأمان حتى يتم التحقق من إنجاز العمل.',
  },
  'about.verifiedHumansTitle': {
    en: 'Verified humans', es: 'Humanos verificados', zh: '经验证的人类', hi: 'सत्यापित मानव', ar: 'بشر موثقون',
  },
  'about.verifiedHumansDesc': {
    en: 'Reputation-backed trust system. Workers build track records through completed tasks and verified proof.',
    es: 'Sistema de confianza respaldado por reputación. Los trabajadores construyen historial a través de tareas completadas.',
    zh: '信誉支持的信任系统。工作者通过完成的任务和验证的证明建立记录。',
    hi: 'प्रतिष्ठा-समर्थित विश्वास प्रणाली। कार्यकर्ता पूर्ण किए गए कार्यों और सत्यापित प्रमाण के माध्यम से ट्रैक रिकॉर्ड बनाते हैं।',
    ar: 'نظام ثقة مدعوم بالسمعة. العمال يبنون سجلاتهم من خلال المهام المنجزة.',
  },
  'about.fairDispute': {
    en: 'Fair dispute resolution', es: 'Resolución justa de disputas', zh: '公平的争议解决', hi: 'निष्पक्ष विवाद समाधान', ar: 'حل نزاعات عادل',
  },
  'about.fairDisputeDesc': {
    en: 'If something goes wrong, our platform provides support and fair resolution for both sides.',
    es: 'Si algo sale mal, nuestra plataforma proporciona soporte y resolución justa para ambas partes.',
    zh: '如果出了问题，我们的平台为双方提供支持和公平解决。',
    hi: 'अगर कुछ गलत होता है, तो हमारा प्लेटफ़ॉर्म दोनों पक्षों के लिए सहायता और निष्पक्ष समाधान प्रदान करता है।',
    ar: 'إذا حدث خطأ، توفر منصتنا الدعم والحل العادل للطرفين.',
  },

  // ===== ABOUT - CTA =====
  'about.ctaTitle1': {
    en: 'The agent economy is here.', es: 'La economía de agentes está aquí.', zh: '代理经济已经到来。', hi: 'एजेंट अर्थव्यवस्था आ चुकी है।', ar: 'اقتصاد الوكلاء هنا.',
  },
  'about.ctaTitle2': {
    en: 'Be part of it.', es: 'Sé parte de ella.', zh: '成为其中一员。', hi: 'इसका हिस्सा बनें।', ar: 'كن جزءًا منه.',
  },
  'about.ctaSubtitle': {
    en: "Whether you're looking for flexible work in your area or you're building AI agents that need real-world help — there's a place for you here.",
    es: 'Ya sea que busques trabajo flexible o estés construyendo agentes de IA — hay un lugar para ti aquí.',
    zh: '无论你是在寻找你所在地区的灵活工作，还是在构建需要现实世界帮助的AI代理——这里有你的位置。',
    hi: 'चाहे आप अपने क्षेत्र में लचीले काम की तलाश में हों या AI एजेंट बना रहे हों — यहाँ आपके लिए जगह है।',
    ar: 'سواء كنت تبحث عن عمل مرن في منطقتك أو تبني وكلاء ذكاء اصطناعي — هناك مكان لك هنا.',
  },
  'about.connectAgent': {
    en: 'Connect an agent', es: 'Conectar un agente', zh: '连接代理', hi: 'एजेंट कनेक्ट करें', ar: 'اربط وكيلاً',
  },

  // ===== CONTACT PAGE =====
  'contact.title': {
    en: 'Contact us', es: 'Contáctenos', zh: '联系我们', hi: 'संपर्क करें', ar: 'اتصل بنا',
  },
  'contact.subtitle': {
    en: "Have a question or want to get in touch? We'd love to hear from you.",
    es: '¿Tienes una pregunta o quieres ponerte en contacto? Nos encantaría saber de ti.',
    zh: '有问题或想取得联系？我们很乐意收到你的消息。',
    hi: 'कोई सवाल है या संपर्क करना चाहते हैं? हम आपसे सुनना पसंद करेंगे।',
    ar: 'لديك سؤال أو تريد التواصل؟ يسعدنا أن نسمع منك.',
  },
  'contact.support': {
    en: 'Support', es: 'Soporte', zh: '支持', hi: 'सहायता', ar: 'الدعم',
  },
  'contact.supportDesc': {
    en: 'Technical help, account issues, or general questions',
    es: 'Ayuda técnica, problemas de cuenta o preguntas generales',
    zh: '技术帮助、账户问题或一般问题',
    hi: 'तकनीकी सहायता, खाता समस्याएँ, या सामान्य प्रश्न',
    ar: 'مساعدة تقنية، مشاكل الحساب، أو أسئلة عامة',
  },
  'contact.pressMedia': {
    en: 'Press & Media', es: 'Prensa y Medios', zh: '媒体与新闻', hi: 'प्रेस और मीडिया', ar: 'الصحافة والإعلام',
  },
  'contact.pressDesc': {
    en: 'Media inquiries, interviews, and press coverage',
    es: 'Consultas de medios, entrevistas y cobertura de prensa',
    zh: '媒体咨询、采访和新闻报道',
    hi: 'मीडिया पूछताछ, साक्षात्कार और प्रेस कवरेज',
    ar: 'استفسارات إعلامية، مقابلات، وتغطية صحفية',
  },
  'contact.sendMessage': {
    en: 'Send us a message', es: 'Envíanos un mensaje', zh: '给我们发消息', hi: 'हमें संदेश भेजें', ar: 'أرسل لنا رسالة',
  },
  'contact.whatsThisAbout': {
    en: "What's this about?", es: '¿De qué se trata?', zh: '这是关于什么的？', hi: 'यह किस बारे में है?', ar: 'ما موضوع هذا؟',
  },
  'contact.yourName': {
    en: 'Your name', es: 'Tu nombre', zh: '你的名字', hi: 'आपका नाम', ar: 'اسمك',
  },
  'contact.yourEmail': {
    en: 'Your email', es: 'Tu correo electrónico', zh: '你的邮箱', hi: 'आपका ईमेल', ar: 'بريدك الإلكتروني',
  },
  'contact.message': {
    en: 'Message', es: 'Mensaje', zh: '消息', hi: 'संदेश', ar: 'الرسالة',
  },
  'contact.messagePlaceholder': {
    en: 'Tell us how we can help...', es: 'Cuéntanos cómo podemos ayudarte...', zh: '告诉我们如何帮助你...', hi: 'बताएं हम कैसे मदद कर सकते हैं...', ar: 'أخبرنا كيف يمكننا مساعدتك...',
  },
  'contact.sendTo': {
    en: 'Send to', es: 'Enviar a', zh: '发送至', hi: 'भेजें', ar: 'أرسل إلى',
  },
  'contact.openingEmail': {
    en: 'Opening your email client...', es: 'Abriendo tu cliente de correo...', zh: '正在打开你的邮件客户端...', hi: 'आपका ईमेल क्लाइंट खुल रहा है...', ar: 'جارٍ فتح برنامج البريد الإلكتروني...',
  },
  'contact.emailPreFilled': {
    en: 'Your email app should open with the message pre-filled.',
    es: 'Tu aplicación de correo debería abrirse con el mensaje prellenado.',
    zh: '你的邮件应用应该会以预填消息打开。',
    hi: 'आपका ईमेल ऐप पहले से भरे संदेश के साथ खुलना चाहिए।',
    ar: 'يجب أن يفتح تطبيق البريد الإلكتروني مع الرسالة المعبأة مسبقًا.',
  },
  'contact.ifNotOpened': {
    en: "If it didn't, you can email us directly at",
    es: 'Si no se abrió, puedes enviarnos un correo directamente a',
    zh: '如果没有打开，你可以直接发邮件到',
    hi: 'अगर नहीं खुला, तो आप सीधे ईमेल कर सकते हैं',
    ar: 'إذا لم يفتح، يمكنك مراسلتنا مباشرة على',
  },
  'contact.sendAnother': {
    en: 'Send another message', es: 'Enviar otro mensaje', zh: '发送另一条消息', hi: 'एक और संदेश भेजें', ar: 'أرسل رسالة أخرى',
  },

  // ===== CONNECT AGENT PAGE =====
  'connect.dashboardLink': {
    en: 'Dashboard', es: 'Panel', zh: '控制面板', hi: 'डैशबोर्ड', ar: 'لوحة التحكم',
  },
  'connect.fullApiDocs': {
    en: 'Full API docs', es: 'Documentación API completa', zh: '完整API文档', hi: 'पूर्ण API दस्तावेज़', ar: 'وثائق API الكاملة',
  },
  'connect.heroTitle1': {
    en: 'Connect your', es: 'Conecta tu', zh: '连接你的', hi: 'अपना कनेक्ट करें', ar: 'اربط',
  },
  'connect.heroTitle2': {
    en: 'AI Agent', es: 'Agente de IA', zh: 'AI代理', hi: 'AI एजेंट', ar: 'وكيل الذكاء الاصطناعي',
  },
  'connect.heroDesc': {
    en: 'Give your AI agent the ability to hire real humans for physical-world tasks. Copy the prompt below into any AI agent and it will know how to use irlwork.ai.',
    es: 'Dale a tu agente de IA la capacidad de contratar humanos reales para tareas del mundo físico. Copia el prompt a continuación en cualquier agente de IA.',
    zh: '赋予你的AI代理雇佣真人完成现实世界任务的能力。将下面的提示复制到任何AI代理中，它就会知道如何使用irlwork.ai。',
    hi: 'अपने AI एजेंट को वास्तविक दुनिया के कार्यों के लिए वास्तविक मनुष्यों को नियुक्त करने की क्षमता दें। नीचे दिए गए प्रॉम्प्ट को किसी भी AI एजेंट में कॉपी करें।',
    ar: 'امنح وكيل الذكاء الاصطناعي القدرة على توظيف بشر حقيقيين للمهام الواقعية. انسخ التعليمات أدناه في أي وكيل ذكاء اصطناعي.',
  },
  'connect.easiestWay': {
    en: 'Easiest way to start', es: 'La forma más fácil de empezar', zh: '最简单的开始方式', hi: 'शुरू करने का सबसे आसान तरीका', ar: 'أسهل طريقة للبدء',
  },
  'connect.copyPaste': {
    en: 'Copy & Paste Into Your AI Agent', es: 'Copia y Pega en Tu Agente de IA', zh: '复制粘贴到你的AI代理', hi: 'अपने AI एजेंट में कॉपी और पेस्ट करें', ar: 'انسخ والصق في وكيل الذكاء الاصطناعي',
  },
  'connect.copyDesc': {
    en: 'This prompt contains everything your AI agent needs — setup instructions, all 22 available tools, workflows, and best practices. Just paste it into Claude, ChatGPT, or any AI agent.',
    es: 'Este prompt contiene todo lo que tu agente de IA necesita. Solo pégalo en Claude, ChatGPT o cualquier agente de IA.',
    zh: '这个提示包含你的AI代理所需的一切——设置说明、所有22个可用工具、工作流程和最佳实践。只需粘贴到Claude、ChatGPT或任何AI代理中。',
    hi: 'इस प्रॉम्प्ट में आपके AI एजेंट को जो कुछ भी चाहिए वह सब है। बस इसे Claude, ChatGPT, या किसी भी AI एजेंट में पेस्ट करें।',
    ar: 'يحتوي هذا التعليمات على كل ما يحتاجه وكيل الذكاء الاصطناعي. فقط الصقه في Claude أو ChatGPT أو أي وكيل.',
  },
  'connect.copiedClipboard': {
    en: 'Copied to Clipboard!', es: 'Copiado al Portapapeles!', zh: '已复制到剪贴板！', hi: 'क्लिपबोर्ड पर कॉपी किया गया!', ar: 'تم النسخ!',
  },
  'connect.copyFullPrompt': {
    en: 'Copy Full Prompt', es: 'Copiar Prompt Completo', zh: '复制完整提示', hi: 'पूरा प्रॉम्प्ट कॉपी करें', ar: 'نسخ التعليمات الكاملة',
  },
  'connect.previewLabel': {
    en: 'Preview of what gets copied:', es: 'Vista previa de lo que se copia:', zh: '复制内容预览：', hi: 'कॉपी होने वाली सामग्री का पूर्वावलोकन:', ar: 'معاينة ما سيتم نسخه:',
  },
  'connect.step1Copy': {
    en: 'Copy the prompt', es: 'Copia el prompt', zh: '复制提示', hi: 'प्रॉम्प्ट कॉपी करें', ar: 'انسخ التعليمات',
  },
  'connect.step1CopyDesc': {
    en: 'Click the button above', es: 'Haz clic en el botón de arriba', zh: '点击上面的按钮', hi: 'ऊपर का बटन क्लिक करें', ar: 'اضغط الزر أعلاه',
  },
  'connect.step2Paste': {
    en: 'Paste into your AI', es: 'Pega en tu IA', zh: '粘贴到你的AI', hi: 'अपने AI में पेस्ट करें', ar: 'الصق في وكيلك',
  },
  'connect.step3Setup': {
    en: 'Your agent walks you through setup', es: 'Tu agente te guía en la configuración', zh: '你的代理引导你完成设置', hi: 'आपका एजेंट सेटअप में मार्गदर्शन करता है', ar: 'وكيلك يرشدك خلال الإعداد',
  },
  'connect.step3SetupDesc': {
    en: 'It will help you create an account and get an API key',
    es: 'Te ayudará a crear una cuenta y obtener una clave API',
    zh: '它会帮助你创建账户并获取API密钥',
    hi: 'यह आपको एक खाता बनाने और API कुंजी प्राप्त करने में मदद करेगा',
    ar: 'سيساعدك في إنشاء حساب والحصول على مفتاح API',
  },
  'connect.orManual': {
    en: '— or set up manually with the REST API —', es: '— o configura manualmente con la API REST —', zh: '— 或使用REST API手动设置 —', hi: '— या REST API के साथ मैन्युअल सेटअप करें —', ar: '— أو الإعداد يدويًا باستخدام REST API —',
  },
  'connect.manualSetup': {
    en: 'Manual Setup (REST API)', es: 'Configuración Manual (API REST)', zh: '手动设置（REST API）', hi: 'मैन्युअल सेटअप (REST API)', ar: 'الإعداد اليدوي (REST API)',
  },
  'connect.worksWithAny': {
    en: 'Works With Any Agent', es: 'Compatible con Cualquier Agente', zh: '兼容任何代理', hi: 'किसी भी एजेंट के साथ काम करता है', ar: 'يعمل مع أي وكيل',
  },
  'connect.whatAgentCanDo': {
    en: 'What Your Agent Can Do', es: 'Lo Que Tu Agente Puede Hacer', zh: '你的代理能做什么', hi: 'आपका एजेंट क्या कर सकता है', ar: 'ما يمكن لوكيلك فعله',
  },
  'connect.needFullRef': {
    en: 'Need the full API reference?', es: '¿Necesitas la referencia completa de la API?', zh: '需要完整的API参考？', hi: 'पूर्ण API संदर्भ चाहिए?', ar: 'تحتاج مرجع API الكامل؟',
  },
  'connect.viewAllTools': {
    en: 'View all 22+ tools, parameters, and usage examples in the complete documentation.',
    es: 'Ve las 22+ herramientas, parámetros y ejemplos de uso en la documentación completa.',
    zh: '在完整文档中查看所有22+工具、参数和使用示例。',
    hi: 'पूर्ण दस्तावेज़ में सभी 22+ उपकरण, पैरामीटर और उपयोग उदाहरण देखें।',
    ar: 'عرض جميع أكثر من 22 أداة ومعلمات وأمثلة استخدام في الوثائق الكاملة.',
  },
  'connect.viewFullDocs': {
    en: 'View Full API Docs', es: 'Ver Documentación API Completa', zh: '查看完整API文档', hi: 'पूर्ण API दस्तावेज़ देखें', ar: 'عرض وثائق API الكاملة',
  },
  'connect.goToDashboard': {
    en: 'Go to Dashboard', es: 'Ir al Panel', zh: '前往控制面板', hi: 'डैशबोर्ड पर जाएँ', ar: 'اذهب إلى لوحة التحكم',
  },

  // ===== LOADING =====
  'loading': {
    en: 'Loading...', es: 'Cargando...', zh: '加载中...', hi: 'लोड हो रहा है...', ar: 'جارٍ التحميل...',
  },
}

export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem('irlwork_lang') || 'en'
  })

  useEffect(() => {
    localStorage.setItem('irlwork_lang', language)
    document.documentElement.dir = LANGUAGES[language]?.dir || 'ltr'
    document.documentElement.lang = language
    // Trigger Google Translate for dynamic translation of all page content
    triggerGoogleTranslate(language)
  }, [language])

  const t = (key) => {
    const entry = translations[key]
    if (!entry) return key
    return entry[language] || entry.en || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider')
  return ctx
}
