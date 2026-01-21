import { TrainingScenario } from '@/lib/types/training';

export const PREDEFINED_SCENARIOS: Omit<TrainingScenario, 'id' | 'created_at' | 'updated_at' | 'account_id' | 'created_by'>[] = [
  // VENTAS - TELEFONÍA MÓVIL (8 escenarios)
  {
    name: "Venta de Plan Móvil Postpago Premium",
    description: "Eres un cliente interesado en contratar un plan postpago. Actualmente usas prepago y gastas aproximadamente $800 mensuales. Preguntas sobre GB incluidos, velocidad tras agotarlos, apps que no consumen datos, si incluye llamadas ilimitadas y roaming. Objetas el costo de portabilidad y permanencia de 12 meses. Solo contratas si el asesor demuestra ahorro real vs prepago, ofrece promoción de bienvenida y te explica claramente las penalidades por cancelación anticipada.",
    category: "Ventas Móvil",
    difficulty: "intermediate",
    duration_minutes: 15,
    client_personality: {
      type: "skeptical",
      description: "Usuario de prepago cauteloso evaluando cambio a postpago",
      traits: ["analítico", "comparativo", "preocupado por costos ocultos"]
    },
    objectives: [
      "Identificar patrón de consumo actual del cliente",
      "Demostrar ahorro tangible vs prepago",
      "Explicar beneficios del plan de forma clara",
      "Manejar objeción de permanencia efectivamente"
    ],
    context: "Cliente potencial usa prepago con gasto mensual de $800. Busca estabilidad de costos y más beneficios.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Diagnóstico de necesidades", description: "Identificó correctamente el perfil de consumo del cliente", weight: 20 },
      { id: "2", name: "Presentación de beneficios", description: "Explicó claramente ventajas del postpago vs prepago", weight: 25 },
      { id: "3", name: "Manejo de objeciones", description: "Resolvió dudas sobre permanencia y penalidades", weight: 25 },
      { id: "4", name: "Cierre efectivo", description: "Logró compromiso de contratación o siguiente paso", weight: 30 }
    ],
    knowledge_base: "Planes postpago: Plan Básico $39,900 COP/mes (5GB + redes ilimitadas), Plan Plus $59,900 COP/mes (15GB + redes + roaming USA/Canadá), Plan Max $89,900 COP/mes (30GB ilimitados + roaming internacional). Portabilidad sin costo. Permanencia 12 meses, penalidad $200,000-400,000 COP según plan. Promoción: 50% primer mes + SIM gratis.",
    custom_evaluation_instructions: "Evaluar si el agente realizó análisis de consumo, presentó plan adecuado al perfil, manejó objeciones con datos concretos y cerró con próximos pasos claros.",
    expected_outcome: "El cliente debe entender claramente el ahorro proyectado, beneficios del plan, condiciones de permanencia y sentirse confiado para proceder con la contratación.",
    call_completion_rules: {
      success_message: "¡Excelente! Lograste que el cliente comprenda el valor del plan postpago y acepte continuar con el proceso de contratación.",
      failure_message: "El cliente no percibió valor suficiente o quedaron dudas sin resolver. Revisa tu diagnóstico de necesidades y manejo de objeciones.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Venta de Equipo con Plan Móvil",
    description: "Eres un cliente que quiere renovar su smartphone. Tu equipo actual tiene 2 años. Buscas un gama media-alta (Android o iPhone) con plan incluido. Preguntas sobre modelos disponibles, enganche, mensualidades, si el plan es obligatorio, qué pasa si dañas el equipo y si puedes liquidar anticipadamente. Objetas el enganche alto y la permanencia de 18-24 meses. Solo aceptas si hay opciones de enganche flexible, seguro de equipo incluido y puedes ver los términos de financiamiento por escrito.",
    category: "Ventas Móvil",
    difficulty: "advanced",
    duration_minutes: 20,
    client_personality: {
      type: "suspicious",
      description: "Cliente experimentado que conoce el mercado y compara opciones",
      traits: ["informado", "negociador", "exigente con garantías"]
    },
    objectives: [
      "Presentar opciones de equipos según perfil y presupuesto",
      "Explicar esquema de financiamiento claramente",
      "Ofrecer protección de equipo (seguro)",
      "Cerrar venta con condiciones aceptables para ambas partes"
    ],
    context: "Cliente busca renovar smartphone con financiamiento. Conoce el mercado y compara con otras operadoras.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Diagnóstico de preferencias", description: "Identificó marca, gama y presupuesto del cliente", weight: 20 },
      { id: "2", name: "Explicación de financiamiento", description: "Detalló enganches, mensualidades y permanencia claramente", weight: 25 },
      { id: "3", name: "Manejo de objeciones", description: "Ofreció alternativas de enganche y explicó beneficios del seguro", weight: 25 },
      { id: "4", name: "Cierre de venta", description: "Acordó condiciones y siguientes pasos", weight: 30 }
    ],
    knowledge_base: "Equipos disponibles: Gama media $3,500,000-7,000,000 COP (Samsung A54, Xiaomi 13), Gama alta $12,000,000-20,000,000 COP (Samsung S24, iPhone 15). Enganches desde 20% con plan. Permanencia 18-24 meses. Seguro de equipo $99,000-149,000 COP/mes cubre daños y robo. Liquidación anticipada sin penalidad después del mes 12.",
    custom_evaluation_instructions: "Verificar que el agente presentó opciones adecuadas al presupuesto, explicó financiamiento con transparencia, ofreció seguro y manejó objeciones de forma consultiva.",
    expected_outcome: "El cliente debe comprender las opciones de equipos, esquema de financiamiento, beneficios del seguro y tener claridad para tomar decisión de compra.",
    call_completion_rules: {
      success_message: "¡Muy bien! El cliente aceptó la propuesta de equipo con financiamiento y procederá con la contratación.",
      failure_message: "El cliente no se convenció de las condiciones de financiamiento. Refuerza tu propuesta de valor y flexibilidad en opciones.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Portabilidad de Competencia",
    description: "Eres un cliente de otra operadora evaluando cambiarte. Tu línea actual tiene $450/mes con 10GB. Has visto anuncios sobre portabilidad con beneficios. Preguntas qué plan te conviene, cuántos GB te dan, si conservas tu número, cuánto tarda el proceso, si pierdes saldo o días, y qué promociones hay por portarte. Objetas que el proceso sea complicado o tarde mucho. Solo te portas si el plan es superior, el proceso es sencillo (máximo 24h), recibes beneficio tangible y te dan seguimiento personalizado.",
    category: "Ventas Móvil",
    difficulty: "intermediate",
    duration_minutes: 18,
    client_personality: {
      type: "curious",
      description: "Cliente insatisfecho con operadora actual buscando mejor oferta",
      traits: ["abierto al cambio", "busca incentivos", "quiere proceso simple"]
    },
    objectives: [
      "Identificar insatisfacción con operadora actual",
      "Presentar plan superior con beneficios claros",
      "Explicar proceso de portabilidad paso a paso",
      "Ofrecer promoción atractiva por portabilidad"
    ],
    context: "Cliente con operadora competidora insatisfecho con servicio o precio. Abierto a cambio si encuentra mejor propuesta.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Análisis de plan actual", description: "Identificó correctamente plan y necesidades actuales", weight: 20 },
      { id: "2", name: "Presentación de ventajas", description: "Comparó efectivamente plan propuesto vs actual", weight: 25 },
      { id: "3", name: "Explicación de portabilidad", description: "Detalló proceso, tiempos y requisitos claramente", weight: 25 },
      { id: "4", name: "Incentivos y cierre", description: "Ofreció promoción atractiva y cerró compromiso", weight: 30 }
    ],
    knowledge_base: "Proceso de portabilidad: 1) Solicitud en línea o tienda, 2) Validación 2-24h, 3) Activación automática. No pierdes saldo ni días. Promoción portabilidad: 3 meses 50% descuento + GB dobles primeros 6 meses + SIM gratis. Plan recomendado $49,900 COP/mes (10GB + redes sociales ilimitadas) o $69,900 COP/mes (20GB + roaming).",
    custom_evaluation_instructions: "Evaluar si el agente realizó comparativa efectiva, simplificó el proceso de portabilidad, ofreció incentivos claros y generó confianza para el cambio.",
    expected_outcome: "El cliente debe sentirse motivado al cambio, comprender que el proceso es sencillo, percibir valor superior y estar listo para iniciar portabilidad.",
    call_completion_rules: {
      success_message: "¡Excelente gestión! El cliente está convencido y listo para iniciar su portabilidad.",
      failure_message: "El cliente no percibió suficiente valor para cambiarse. Trabaja en destacar beneficios diferenciales y simplificar el proceso.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Venta de Línea Adicional Familiar",
    description: "Eres un cliente actual que quiere agregar líneas para tu familia (2-3 líneas más). Preguntas sobre descuentos por línea adicional, si comparten GB, cómo controlas el gasto de cada línea, si puedes poner límites y qué pasa si una línea consume todo. Objetas que el costo total sea muy alto. Solo aceptas si hay descuento significativo por línea adicional (20-30%), puedes administrar consumos y el cargo es unificado en una factura.",
    category: "Ventas Móvil",
    difficulty: "intermediate",
    duration_minutes: 15,
    client_personality: {
      type: "friendly",
      description: "Cliente leal buscando solución familiar económica",
      traits: ["familiar", "consciente del presupuesto", "busca control"]
    },
    objectives: [
      "Identificar número de líneas y perfil de cada usuario",
      "Presentar plan familiar con ahorro claro",
      "Explicar controles parentales y de consumo",
      "Cerrar venta multi-línea con descuento"
    ],
    context: "Cliente actual satisfecho quiere expandir servicio a familia. Busca economía y control sobre consumos.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Diagnóstico familiar", description: "Identificó número de líneas y necesidades de cada usuario", weight: 20 },
      { id: "2", name: "Presentación de ahorro", description: "Calculó y demostró ahorro vs líneas individuales", weight: 30 },
      { id: "3", name: "Controles y gestión", description: "Explicó herramientas de control de consumo", weight: 20 },
      { id: "4", name: "Cierre de venta", description: "Cerró con condiciones aceptables y siguiente paso", weight: 30 }
    ],
    knowledge_base: "Plan Familiar: 2 líneas $85,000 COP/mes (ahorro 15%), 3 líneas $120,000 COP/mes (ahorro 20%), 4 líneas $150,000 COP/mes (ahorro 25%). GB compartidos: 25GB totales distribuibles. App Mi Cuenta permite: límites de consumo por línea, bloqueo de servicios premium, alertas de consumo, factura única. Control parental disponible sin costo.",
    custom_evaluation_instructions: "Verificar que el agente cuantificó ahorro real, explicó controles disponibles y generó confianza en la administración del plan familiar.",
    expected_outcome: "El cliente debe visualizar claramente el ahorro, sentirse seguro del control sobre consumos y estar motivado a agregar las líneas familiares.",
    call_completion_rules: {
      success_message: "¡Perfecto! El cliente agregará líneas familiares aprovechando el descuento y controles ofrecidos.",
      failure_message: "El cliente no percibió suficiente ahorro o seguridad en el control. Refuerza la demostración de beneficios económicos.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Upgrade de Plan Prepago a Postpago",
    description: "Eres un cliente prepago de hace 2 años con recargas constantes de $500-700 mensuales. Un asesor te contacta para ofrecerte postpago. Preguntas por qué debería cambiarme, qué beneficios adicionales tendría, si perderé mi número, si hay compromiso de permanencia y qué pasa si un mes no puedo pagar. Objetas que el prepago te da libertad de no tener facturas. Solo consideras el cambio si demuestran que gastaré menos, tendré más GB/beneficios, el proceso de cambio es automático y hay flexibilidad de pago.",
    category: "Ventas Móvil",
    difficulty: "intermediate",
    duration_minutes: 12,
    client_personality: {
      type: "skeptical",
      description: "Cliente prepago satisfecho que necesita razones fuertes para cambiar",
      traits: ["conservador", "habituado a su esquema actual", "busca garantías"]
    },
    objectives: [
      "Identificar patrón de recargas y consumo",
      "Demostrar beneficios económicos del postpago",
      "Desmitificar miedos sobre facturas y compromiso",
      "Facilitar proceso de migración"
    ],
    context: "Cliente prepago con consumo estable que podría beneficiarse de postpago pero tiene resistencia al cambio.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Análisis de consumo", description: "Calculó gasto promedio mensual del cliente", weight: 25 },
      { id: "2", name: "Demostración de ahorro", description: "Mostró ahorro tangible con plan postpago", weight: 30 },
      { id: "3", name: "Manejo de objeciones", description: "Resolvió temores sobre facturas y permanencia", weight: 25 },
      { id: "4", name: "Facilitación de cambio", description: "Explicó proceso simple de migración", weight: 20 }
    ],
    knowledge_base: "Migración Prepago a Postpago: Proceso automático en 24h, conservas tu número y antigüedad. Plan recomendado $54,900 COP/mes (12GB + redes ilimitadas) vs recargas $60,000-70,000 COP/mes. Beneficios adicionales: roaming internacional, navegación sin límite después de GB a 2Mbps, llamadas ilimitadas. Factura electrónica con múltiples formas de pago. Sin permanencia forzosa, solo compromiso mensual.",
    custom_evaluation_instructions: "Evaluar si el agente logró vencer resistencia al cambio mostrando beneficios concretos, facilitando el proceso y generando confianza.",
    expected_outcome: "El cliente debe comprender que el postpago le ofrece más por menos, el cambio es sencillo y no representa riesgo significativo.",
    call_completion_rules: {
      success_message: "¡Excelente! El cliente acepta migrar a postpago al entender los beneficios y facilidad del proceso.",
      failure_message: "El cliente no visualizó suficiente valor para cambiar su esquema actual. Refuerza la comparativa económica y beneficios.",
      auto_close_on_failure: false
    }
  },

  // VENTAS - SERVICIOS HOGAR (10 escenarios)
  {
    name: "Venta de Internet Hogar Fibra Óptica",
    description: "Eres un prospecto que busca contratar Internet para tu hogar. Actualmente no tienes servicio o usas Internet móvil. Vives en una casa con 3-4 personas. Preguntas sobre velocidades disponibles, si es fibra real, costo de instalación, si incluye módem/router, cuántos dispositivos soporta, si hay técnico y plazo de instalación. Objetas que la instalación sea costosa o tarde mucho. Solo contratas si la velocidad es suficiente para streaming/videojuegos, instalación es rápida (máximo 7 días) con costo accesible o gratis, y hay garantía de velocidad.",
    category: "Ventas Hogar",
    difficulty: "beginner",
    duration_minutes: 15,
    client_personality: {
      type: "curious",
      description: "Prospecto nuevo interesado en Internet hogar pero sin experiencia previa",
      traits: ["preguntón", "quiere entender el servicio", "preocupado por instalación"]
    },
    objectives: [
      "Diagnosticar necesidades de conectividad del hogar",
      "Presentar plan adecuado a número de usuarios y uso",
      "Explicar proceso de instalación claramente",
      "Cerrar venta con fecha de instalación"
    ],
    context: "Prospecto sin servicio de Internet hogar actual busca contratar. Hogar con múltiples usuarios y dispositivos.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Diagnóstico de necesidades", description: "Identificó número de usuarios, dispositivos y tipo de uso", weight: 20 },
      { id: "2", name: "Recomendación de plan", description: "Sugirió velocidad apropiada al perfil del hogar", weight: 25 },
      { id: "3", name: "Explicación de instalación", description: "Detalló proceso, tiempos y costos de instalación", weight: 25 },
      { id: "4", name: "Cierre con agenda", description: "Agendó instalación y cerró la venta", weight: 30 }
    ],
    knowledge_base: "Planes Internet Hogar: Básico 50Mbps $39,900 COP/mes, Medio 100Mbps $49,900 COP/mes, Alto 200Mbps $69,900 COP/mes, Ultra 500Mbps $99,900 COP/mes. Fibra óptica simétrica. Instalación: $39,900 COP o GRATIS con permanencia 12 meses. Incluye módem Wi-Fi 5GHz. Técnico certificado. Instalación en 3-7 días hábiles. Garantía de velocidad 90%.",
    custom_evaluation_instructions: "Verificar que el agente realizó diagnóstico de uso, recomendó plan adecuado, aclaró todos los aspectos de instalación y cerró con fecha concreta.",
    expected_outcome: "El cliente debe tener claridad sobre el plan contratado, proceso de instalación, costos totales y fecha programada de instalación.",
    call_completion_rules: {
      success_message: "¡Excelente venta! El cliente contrató Internet hogar con instalación programada.",
      failure_message: "El cliente no se decidió. Revisa tu diagnóstico y si aclaraste dudas sobre instalación y velocidad.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Venta de Paquete Triple Play (Internet + TV + Telefonía)",
    description: "Eres un cliente que quiere contratar el paquete completo para tu hogar. Actualmente tienes TV de paga con otra empresa. Preguntas qué canales incluye el paquete, si tiene canales premium, qué velocidad de Internet, si la telefonía tiene minutos ilimitados, cuántas pantallas simultáneas de TV, si incluye decodificador y qué cuesta la instalación completa. Objetas el precio total y la permanencia. Solo contratas si el paquete es significativamente más barato que servicios separados (ahorro 30%+), instalación es un solo día y hay periodo de prueba.",
    category: "Ventas Hogar",
    difficulty: "advanced",
    duration_minutes: 20,
    client_personality: {
      type: "skeptical",
      description: "Cliente que busca el mejor paquete integral comparando con su servicio actual",
      traits: ["comparativo", "orientado al ahorro", "exigente con garantías"]
    },
    objectives: [
      "Identificar servicios actuales y costos del cliente",
      "Presentar paquete Triple Play con ahorro claro",
      "Detallar beneficios integrados del paquete",
      "Cerrar venta con demostración de valor"
    ],
    context: "Cliente con servicios de TV y posiblemente Internet con otros proveedores. Evalúa cambio por economía y conveniencia.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Análisis de servicios actuales", description: "Identificó servicios y costos actuales del cliente", weight: 20 },
      { id: "2", name: "Presentación de ahorro", description: "Calculó y demostró ahorro vs servicios por separado", weight: 30 },
      { id: "3", name: "Detalles del paquete", description: "Explicó componentes del paquete claramente", weight: 20 },
      { id: "4", name: "Cierre de venta", description: "Cerró con ahorro demostrado y fecha de instalación", weight: 30 }
    ],
    knowledge_base: "Paquete Triple Play: Internet 100Mbps + TV 150 canales (20 HD) + Telefonía Ilimitada = $89,900 COP/mes (ahorro 35% vs servicios separados). Incluye: 2 decodificadores HD, módem Wi-Fi, instalación completa en 1 día. Canales premium disponibles desde $15,000 COP/mes adicionales. Permanencia 12 meses. Garantía de satisfacción 30 días.",
    custom_evaluation_instructions: "Evaluar si el agente realizó comparativa económica efectiva, detalló todos los componentes del paquete y justificó el valor integral.",
    expected_outcome: "El cliente debe percibir ahorro significativo, conveniencia de tener todos los servicios con un proveedor y estar motivado a contratar el paquete.",
    call_completion_rules: {
      success_message: "¡Venta exitosa! El cliente contrata Triple Play con clara percepción de ahorro y valor.",
      failure_message: "El cliente no percibió suficiente ahorro o valor. Refuerza la comparativa económica y beneficios integrados.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Upgrade de Velocidad de Internet",
    description: "Eres un cliente actual con Internet 50Mbps. Últimamente has tenido problemas de velocidad (lento para videollamadas, streaming entrecortado, juegos con lag). Llamas para quejarte pero el asesor te ofrece upgrade. Preguntas qué velocidad te recomiendan, cuánto cuesta más, si hay que cambiar el módem, cuándo lo activan y si hay compromiso adicional. Objetas pagar más por un servicio que debería funcionar desde el inicio. Solo aceptas upgrade si la mejora es significativa, el costo adicional es bajo ($100-150 más), la activación es inmediata y hay descuento por los meses de mal servicio.",
    category: "Ventas Hogar",
    difficulty: "intermediate",
    duration_minutes: 18,
    client_personality: {
      type: "aggressive",
      description: "Cliente molesto por mal servicio que puede aprovechar para venta",
      traits: ["frustrado", "exigente de compensación", "busca solución inmediata"]
    },
    objectives: [
      "Reconocer la molestia del cliente por mal servicio",
      "Diagnosticar que el problema es insuficiente velocidad",
      "Ofrecer upgrade como solución con beneficio",
      "Cerrar upgrade con compensación por inconvenientes"
    ],
    context: "Cliente insatisfecho con velocidad actual. Oportunidad de convertir queja en venta de upgrade.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Empatía y reconocimiento", description: "Reconoció la frustración y se disculpó adecuadamente", weight: 20 },
      { id: "2", name: "Diagnóstico técnico", description: "Identificó que velocidad actual es insuficiente", weight: 20 },
      { id: "3", name: "Propuesta de upgrade", description: "Ofreció upgrade con beneficios claros", weight: 30 },
      { id: "4", name: "Compensación y cierre", description: "Ofreció descuento/compensación y cerró upgrade", weight: 30 }
    ],
    knowledge_base: "Upgrades disponibles: de 50Mbps a 100Mbps +$10,000 COP/mes, a 200Mbps +$20,000 COP/mes, a 500Mbps +$50,000 COP/mes. Activación inmediata remota (sin técnico si módem es compatible). Compensación por inconvenientes: 1 mes 50% descuento en la nueva velocidad. Sin cambio de permanencia.",
    custom_evaluation_instructions: "Verificar que el agente transformó la queja en oportunidad de venta, ofreció solución real con compensación justa y cerró el upgrade.",
    expected_outcome: "El cliente debe sentirse escuchado, percibir que el upgrade resuelve su problema y aceptar el cambio con la compensación ofrecida.",
    call_completion_rules: {
      success_message: "¡Excelente recuperación! Convertiste una queja en venta de upgrade con cliente satisfecho.",
      failure_message: "No lograste convertir la queja en oportunidad. Trabaja en tu propuesta de valor y compensación.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Venta de Servicio de TV Streaming",
    description: "Eres un cliente que quiere cancelar la TV por cable tradicional y cambiar a streaming. Preguntas si la operadora tiene servicio de streaming, qué contenido incluye, cuántos dispositivos pueden ver simultáneamente, si funciona fuera de casa, si tiene app para smart TV/celular, qué cuesta y si necesitas Internet de cierta velocidad. Objetas depender totalmente de Internet y perder canales de noticias/deportes. Solo contratas si el catálogo es amplio, precio es menor que cable ($200-300 menos), puedes ver en múltiples dispositivos y hay periodo de prueba.",
    category: "Ventas Hogar",
    difficulty: "intermediate",
    duration_minutes: 15,
    client_personality: {
      type: "curious",
      description: "Cliente moderno buscando alternativa más económica y flexible a TV tradicional",
      traits: ["tech-savvy", "busca economía", "valora flexibilidad"]
    },
    objectives: [
      "Identificar hábitos de consumo de TV actuales",
      "Presentar plataforma de streaming con contenido relevante",
      "Explicar ventajas de streaming vs cable tradicional",
      "Cerrar venta con periodo de prueba"
    ],
    context: "Cliente insatisfecho con costo de TV de paga tradicional busca alternativa streaming más económica.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Diagnóstico de uso", description: "Identificó canales/contenido más consumido", weight: 20 },
      { id: "2", name: "Presentación de servicio", description: "Explicó catálogo, dispositivos y funcionalidades", weight: 25 },
      { id: "3", name: "Comparativa de valor", description: "Demostró ahorro y ventajas vs TV tradicional", weight: 25 },
      { id: "4", name: "Cierre con prueba", description: "Ofreció periodo de prueba y cerró venta", weight: 30 }
    ],
    knowledge_base: "Servicio Streaming: $29,900 COP/mes incluye +150 canales en vivo (noticias, deportes, entretenimiento) + contenido on demand. Compatible con Smart TV, celulares, tablets, computadoras. Hasta 4 pantallas simultáneas. App disponible iOS/Android. Internet recomendado: mínimo 25Mbps. Prueba gratis 7 días. Sin permanencia.",
    custom_evaluation_instructions: "Verificar que el agente mostró ventajas de streaming, aseguró que contenido cubre necesidades del cliente y facilitó la transición con periodo de prueba.",
    expected_outcome: "El cliente debe estar convencido del ahorro, comprender la plataforma de streaming y estar motivado a probar el servicio.",
    call_completion_rules: {
      success_message: "¡Muy bien! El cliente inicia periodo de prueba de streaming con intención de cambiar definitivamente.",
      failure_message: "El cliente no se convenció del cambio. Refuerza beneficios de streaming y ofrece demostración.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Renovación de Contrato con Upgrade",
    description: "Eres un cliente actual cuyo contrato de 12 meses está por vencer. Tienes Internet 100Mbps + TV básica. Llaman para renovar. Preguntas qué promoción hay para clientes que renuevan, si puedes mejorar velocidad, agregar más canales o servicios sin aumentar mucho el costo, y cuánto tiempo de permanencia piden. Objetas que las promociones sean solo para clientes nuevos. Solo renuevas si hay descuento por lealtad (15-20%), mejoras al servicio sin costo o mínimo incremento, y flexibilidad en permanencia (6-12 meses).",
    category: "Ventas Hogar",
    difficulty: "intermediate",
    duration_minutes: 15,
    client_personality: {
      type: "friendly",
      description: "Cliente leal pero que espera reconocimiento por su lealtad",
      traits: ["leal pero exigente", "busca ser valorado", "abierto a renovar con incentivos"]
    },
    objectives: [
      "Reconocer lealtad del cliente",
      "Ofrecer beneficios exclusivos por renovación",
      "Proponer upgrade de servicios con valor agregado",
      "Cerrar renovación con condiciones atractivas"
    ],
    context: "Cliente satisfecho con servicio actual busca reconocimiento de lealtad y mejores condiciones al renovar.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Reconocimiento de lealtad", description: "Agradeció y valoró la permanencia del cliente", weight: 20 },
      { id: "2", name: "Propuesta de renovación", description: "Ofreció beneficios exclusivos por renovar", weight: 30 },
      { id: "3", name: "Upgrade estratégico", description: "Propuso mejoras de servicio con buen valor", weight: 25 },
      { id: "4", name: "Cierre de renovación", description: "Cerró renovación con compromiso del cliente", weight: 25 }
    ],
    knowledge_base: "Programa de Lealtad Renovación: Clientes actuales reciben 20% descuento permanente + upgrade velocidad sin costo (100Mbps a 200Mbps) o +30 canales TV gratis. Permanencia flexible 6-12 meses a elección. Proceso automático sin técnico. Beneficio activo en renovación automática.",
    custom_evaluation_instructions: "Evaluar si el agente hizo sentir valorado al cliente, ofreció beneficios tangibles por lealtad y cerró renovación exitosamente.",
    expected_outcome: "El cliente debe sentirse valorado, percibir mejora en su servicio sin aumento de costo y renovar su contrato con satisfacción.",
    call_completion_rules: {
      success_message: "¡Excelente retención! Cliente renueva contrato satisfecho con beneficios de lealtad.",
      failure_message: "No lograste retener al cliente. Refuerza tu propuesta de valor para clientes leales.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Venta de Internet Hogar para Trabajo Remoto",
    description: "Eres un cliente que trabaja desde casa. Necesitas Internet ultra confiable para videollamadas constantes, subir archivos pesados y conferencias. Tu Internet actual es inestable. Preguntas qué velocidad simétrica tienen, si garantizan uptime, si incluye IP fija, soporte prioritario y qué pasa si hay fallas. Objetas pagar más sin garantía real de servicio. Solo contratas si ofrecen plan business o premium con SLA definido, soporte 24/7, velocidad simétrica mínima 100Mbps y compensación por tiempo fuera de servicio.",
    category: "Ventas Hogar",
    difficulty: "advanced",
    duration_minutes: 20,
    client_personality: {
      type: "skeptical",
      description: "Profesional que depende de Internet para trabajar, exigente con confiabilidad",
      traits: ["profesional", "orientado a confiabilidad", "exigente con SLA"]
    },
    objectives: [
      "Identificar necesidades profesionales de conectividad",
      "Presentar plan business con garantías claras",
      "Explicar SLA y soporte diferenciado",
      "Cerrar venta con garantías documentadas"
    ],
    context: "Profesional con trabajo remoto que requiere Internet altamente confiable con garantías de servicio.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Diagnóstico profesional", description: "Identificó necesidades críticas de trabajo remoto", weight: 20 },
      { id: "2", name: "Presentación de solución", description: "Propuso plan business con garantías claras", weight: 30 },
      { id: "3", name: "SLA y soporte", description: "Explicó acuerdos de nivel de servicio y soporte", weight: 25 },
      { id: "4", name: "Cierre con garantías", description: "Cerró venta con garantías documentadas", weight: 25 }
    ],
    knowledge_base: "Plan Business: 200Mbps simétricos $129,900 COP/mes. SLA 99.5% uptime. Soporte prioritario 24/7. IP fija incluida. Compensación: 1 día gratis por cada 4 horas fuera de servicio. Router empresarial incluido. Instalación con ingeniero certificado. Monitoreo proactivo. Atención de fallas en máximo 4 horas.",
    custom_evaluation_instructions: "Verificar que el agente entendió criticidad del servicio, presentó solución business adecuada con garantías claras y generó confianza profesional.",
    expected_outcome: "El cliente debe tener certeza de confiabilidad del servicio, claridad en garantías y SLA, y estar convencido de contratar plan business.",
    call_completion_rules: {
      success_message: "¡Venta business exitosa! Cliente profesional contrata con confianza en garantías de servicio.",
      failure_message: "El cliente no percibió suficiente confiabilidad. Refuerza garantías de SLA y casos de éxito business.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Venta de Mega Paquete con Líneas Móviles",
    description: "Eres un cliente que busca integrar todos los servicios de casa y móviles en un solo proveedor. Actualmente tienes Internet y TV en casa, y 3 líneas móviles con otra operadora. Preguntas sobre el mega paquete, cuánto ahorrarías consolidando todo, si cada línea móvil tiene suficientes GB, cómo es la administración, cuántos decodificadores incluye y si hay descuento significativo. Objetas que sea complicado administrar tantos servicios. Solo contratas si el ahorro es del 40%+ vs proveedores separados, hay app para gestionar todo, un solo pago y atención preferente.",
    category: "Ventas Hogar",
    difficulty: "advanced",
    duration_minutes: 25,
    client_personality: {
      type: "friendly",
      description: "Cliente buscando máxima conveniencia y economía consolidando servicios",
      traits: ["organizado", "busca simplificación", "orientado a ahorro máximo"]
    },
    objectives: [
      "Identificar todos los servicios actuales y costos",
      "Presentar mega paquete con ahorro significativo",
      "Explicar conveniencia de gestión unificada",
      "Cerrar venta de consolidación total"
    ],
    context: "Cliente con múltiples servicios en diferentes proveedores busca consolidar por economía y conveniencia.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Mapeo de servicios", description: "Identificó todos servicios y costos actuales", weight: 20 },
      { id: "2", name: "Presentación de mega ahorro", description: "Calculó y demostró ahorro por consolidación", weight: 35 },
      { id: "3", name: "Conveniencia de gestión", description: "Explicó facilidad de administración unificada", weight: 20 },
      { id: "4", name: "Cierre integral", description: "Cerró venta de paquete completo", weight: 25 }
    ],
    knowledge_base: "Mega Paquete Total: Internet 200Mbps + TV 180 canales + 3 líneas móviles (15GB c/u) + telefonía fija = $179,900 COP/mes (ahorro 45% vs servicios separados que costarían $328,000 COP). Una sola factura. App Mi Cuenta Total para gestionar todo. Atención preferente. 3 decodificadores incluidos. Instalación completa en 1 día. Permanencia 18 meses.",
    custom_evaluation_instructions: "Evaluar si el agente demostró ahorro máximo de forma convincente, simplificó la complejidad de gestión y cerró venta integral.",
    expected_outcome: "El cliente debe visualizar ahorro significativo, conveniencia de gestión unificada y estar motivado a consolidar todos sus servicios.",
    call_completion_rules: {
      success_message: "¡Venta mega paquete exitosa! Cliente consolida todos sus servicios con gran ahorro percibido.",
      failure_message: "No lograste convencer de consolidación. Refuerza demostración de ahorro y simplificación de gestión.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Venta de TV Satelital para Zona Rural",
    description: "Eres un cliente en zona rural donde no llega fibra óptica. Buscas TV de paga y posiblemente Internet satelital. Preguntas qué canales tienen, si la señal es confiable con lluvia, cómo es la instalación de antena, cuánto cuesta el equipo, si hay Internet satelital disponible y qué velocidad. Objetas costos de instalación y equipos. Solo contratas si hay paquete completo rural (TV + Internet satelital), instalación con técnico especializado, garantía de señal y costo competitivo vs opciones locales limitadas.",
    category: "Ventas Hogar",
    difficulty: "intermediate",
    duration_minutes: 18,
    client_personality: {
      type: "curious",
      description: "Cliente rural con opciones limitadas buscando mejor servicio disponible",
      traits: ["pragmático", "conoce limitaciones de zona", "valora confiabilidad"]
    },
    objectives: [
      "Identificar ubicación y servicios disponibles en zona",
      "Presentar solución satelital como mejor opción",
      "Explicar instalación especializada y garantías",
      "Cerrar venta con solución completa rural"
    ],
    context: "Cliente en zona rural sin acceso a fibra óptica requiere solución satelital para TV e Internet.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Diagnóstico de ubicación", description: "Confirmó zona rural y opciones disponibles", weight: 20 },
      { id: "2", name: "Presentación de solución", description: "Propuso paquete satelital adecuado a zona", weight: 25 },
      { id: "3", name: "Explicación técnica", description: "Detalló instalación, equipos y funcionamiento", weight: 25 },
      { id: "4", name: "Cierre rural", description: "Cerró venta con agenda de instalación técnica", weight: 30 }
    ],
    knowledge_base: "Paquete Rural Satelital: TV 120 canales + Internet 15Mbps = $89,900 COP/mes. Instalación incluye: antena parabólica, decodificador HD, módem satelital, instalación técnica especializada $99,900 COP (puede ser sin costo con permanencia 24 meses). Garantía de señal. Funciona en toda la república. Internet con límite 50GB/mes, después 2Mbps ilimitado.",
    custom_evaluation_instructions: "Verificar que el agente presentó solución satelital como la mejor disponible para zona rural, explicó técnicamente y cerró con instalación programada.",
    expected_outcome: "El cliente debe comprender que la solución satelital es la mejor para su ubicación, entender limitaciones y estar satisfecho con la propuesta.",
    call_completion_rules: {
      success_message: "¡Venta rural exitosa! Cliente en zona rural contrata paquete satelital con claridad de servicio.",
      failure_message: "El cliente no se convenció de solución satelital. Refuerza ventajas vs opciones limitadas en zona rural.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Retención de Cliente que Quiere Cancelar Servicios",
    description: "Eres un cliente que llama para cancelar tus servicios (Internet + TV). Razones: costo alto, encontraste promoción de competencia o estás insatisfecho con algo. Estás decidido a cancelar. El asesor de retención intentará recuperarte. Preguntas alternativas: si hay plan más barato, si pueden igualar oferta de competencia, si mejoran el servicio. Objetas que te retengan sin oferta real. Solo te quedas si hay descuento significativo (30-40%), upgrade sin costo, compensación por molestias previas o beneficio exclusivo por quedarte.",
    category: "Ventas Hogar",
    difficulty: "advanced",
    duration_minutes: 20,
    client_personality: {
      type: "aggressive",
      description: "Cliente decidido a cancelar, solo retención con oferta muy atractiva lo convencerá",
      traits: ["determinado", "comparativo con competencia", "necesita incentivo fuerte"]
    },
    objectives: [
      "Identificar razón real de cancelación",
      "Ofrecer solución específica al motivo de cancelación",
      "Proponer beneficio exclusivo de retención",
      "Retener cliente con compromiso satisfactorio"
    ],
    context: "Cliente decidido a cancelar por precio, oferta de competencia o insatisfacción. Última oportunidad de retención.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Identificación de motivo", description: "Descubrió razón real de cancelación", weight: 25 },
      { id: "2", name: "Empatía y validación", description: "Validó preocupación del cliente apropiadamente", weight: 20 },
      { id: "3", name: "Propuesta de retención", description: "Ofreció incentivo significativo y personalizado", weight: 30 },
      { id: "4", name: "Cierre de retención", description: "Logró retener al cliente satisfactoriamente", weight: 25 }
    ],
    knowledge_base: "Ofertas de Retención (uso exclusivo retención): Descuento 40% por 6 meses + upgrade velocidad gratis por 12 meses + 50 canales premium sin costo 3 meses + garantía de precio por 12 meses (no sube). Compensación adicional por molestias previas: 1 mes gratis. Activación inmediata de beneficios.",
    custom_evaluation_instructions: "Evaluar si el agente identificó razón de cancelación, ofreció solución específica al problema y convenció al cliente de quedarse con oferta atractiva.",
    expected_outcome: "El cliente debe sentirse escuchado, percibir oferta exclusiva y valiosa, y decidir no cancelar sus servicios.",
    call_completion_rules: {
      success_message: "¡Retención exitosa! Cliente decide quedarse satisfecho con oferta exclusiva de retención.",
      failure_message: "No lograste retener al cliente. Evalúa si tu oferta fue suficientemente atractiva y personalizada.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Venta de Servicio WiFi Mesh para Hogar Grande",
    description: "Eres un cliente con casa grande (2 pisos o muchas habitaciones). Tu Internet actual no llega bien a todos los espacios. Llamas quejándote de señal débil. Preguntas si tienen solución, qué es WiFi Mesh, cuántos dispositivos se necesitan, cuánto cuestan, si la instalación es profesional y si funciona con tu plan actual. Objetas pagar más por equipos. Solo aceptas si la solución garantiza cobertura total, instalación profesional incluida o a bajo costo, equipos en comodato o renta y hay garantía de funcionamiento.",
    category: "Ventas Hogar",
    difficulty: "intermediate",
    duration_minutes: 15,
    client_personality: {
      type: "skeptical",
      description: "Cliente con problema real de cobertura buscando solución efectiva",
      traits: ["técnico-práctico", "quiere solución garantizada", "evalúa costo-beneficio"]
    },
    objectives: [
      "Diagnosticar problema de cobertura WiFi",
      "Explicar solución WiFi Mesh y beneficios",
      "Proponer paquete de equipos adecuado al hogar",
      "Cerrar venta con instalación profesional"
    ],
    context: "Cliente con hogar amplio tiene problemas de cobertura WiFi. Oportunidad de venta de solución Mesh.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Diagnóstico de cobertura", description: "Identificó tamaño de hogar y zonas sin señal", weight: 20 },
      { id: "2", name: "Explicación de Mesh", description: "Explicó claramente qué es WiFi Mesh y ventajas", weight: 25 },
      { id: "3", name: "Propuesta de equipos", description: "Recomendó cantidad adecuada de nodos Mesh", weight: 25 },
      { id: "4", name: "Cierre con instalación", description: "Cerró venta con instalación profesional", weight: 30 }
    ],
    knowledge_base: "Sistema WiFi Mesh: Nodos que crean red única en todo el hogar. Kit 2 nodos (hasta 200m²) $149,900 COP o $9,900 COP/mes x 18 meses. Kit 3 nodos (hasta 350m²) $229,900 COP o $14,900 COP/mes x 18 meses. Instalación profesional $39,900 COP o GRATIS con renta. Compatible con cualquier plan de Internet. Garantía de cobertura total. App de gestión incluida.",
    custom_evaluation_instructions: "Verificar que el agente diagnosticó problema correctamente, educó sobre solución Mesh y cerró venta con garantía de cobertura.",
    expected_outcome: "El cliente debe entender qué es WiFi Mesh, cómo soluciona su problema y estar convencido de instalar el sistema.",
    call_completion_rules: {
      success_message: "¡Venta Mesh exitosa! Cliente resuelve problema de cobertura con solución profesional.",
      failure_message: "No lograste convencer de solución Mesh. Refuerza garantía de cobertura y beneficios técnicos.",
      auto_close_on_failure: false
    }
  },

  // ATENCIÓN AL CLIENTE - MÓVIL (2 escenarios)
  {
    name: "Soporte: Problema de Señal/Cobertura Móvil",
    description: "Eres un cliente molesto porque tu señal móvil es mala en tu casa/trabajo. No puedes hacer llamadas claras ni usar datos. Llamas a soporte exigiendo solución. Preguntas por qué no hay señal si hay torre cerca, cuándo lo arreglarán, si te compensan, si pueden darte repetidor de señal. No aceptas respuestas vagas como 'estamos trabajando en ello'. Exiges: causa raíz, tiempo de solución estimado, compensación (GB adicionales o descuento) y seguimiento documentado.",
    category: "Soporte Móvil",
    difficulty: "advanced",
    duration_minutes: 20,
    client_personality: {
      type: "aggressive",
      description: "Cliente frustrado por fallas de señal que afectan su día a día",
      traits: ["impaciente", "exigente", "busca compensación"]
    },
    objectives: [
      "Desescalar situación con empatía genuina",
      "Diagnosticar causa del problema de señal",
      "Ofrecer solución temporal y definitiva",
      "Compensar adecuadamente por inconvenientes"
    ],
    context: "Cliente con problemas de señal persistentes en ubicaciones importantes requiere solución urgente.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Empatía y desescalada", description: "Reconoció frustración y desescaló apropiadamente", weight: 25 },
      { id: "2", name: "Diagnóstico técnico", description: "Identificó causa del problema de señal", weight: 25 },
      { id: "3", name: "Solución y compensación", description: "Ofreció solución y compensación justa", weight: 30 },
      { id: "4", name: "Seguimiento", description: "Documentó caso y programó seguimiento", weight: 20 }
    ],
    knowledge_base: "Protocolo Problemas de Señal: 1) Validar ubicación en mapa de cobertura, 2) Verificar congestión de red o mantenimiento programado, 3) Opciones: repetidor de señal (en comodato si problema es de la red), configuración de bandas 4G/5G, 4) Compensación: 5GB adicionales por semana sin señal o 20% descuento siguiente factura. Escalación a ingeniería si problema persiste más de 3 días.",
    custom_evaluation_instructions: "Evaluar si el agente manejó la frustración, diagnosticó técnicamente, ofreció soluciones reales y compensó adecuadamente.",
    expected_outcome: "El cliente debe sentirse escuchado, tener claridad de solución con tiempos, recibir compensación y confiar en el seguimiento.",
    call_completion_rules: {
      success_message: "¡Caso resuelto! Cliente satisfecho con diagnóstico, solución y compensación ofrecida.",
      failure_message: "El cliente sigue insatisfecho. Revisa tu empatía, diagnóstico y si la compensación fue adecuada.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Soporte: Aclaración de Cargos en Factura Móvil",
    description: "Eres un cliente confundido y molesto con tu factura móvil. Llegó más alta de lo esperado. Ves cargos que no entiendes: 'servicios digitales', 'roaming', 'excedente de datos'. Llamas exigiendo explicación clara de cada cargo. No aceptas jerga técnica. Preguntas cómo ocurrieron esos cargos, si puedes revertirlos, cómo evitarlos en el futuro y exiges ajuste si son cargos injustificados. Solo quedas satisfecho con desglose claro, eliminación de cargos incorrectos (si aplica) y activación de controles para que no se repita.",
    category: "Soporte Móvil",
    difficulty: "intermediate",
    duration_minutes: 18,
    client_personality: {
      type: "suspicious",
      description: "Cliente desconfiado de cargos no esperados en su factura",
      traits: ["detallista", "sospecha de cargos indebidos", "busca transparencia"]
    },
    objectives: [
      "Revisar factura en detalle con el cliente",
      "Explicar cada cargo con lenguaje simple",
      "Ajustar cargos incorrectos si los hay",
      "Activar controles para prevenir cargos futuros"
    ],
    context: "Cliente recibe factura con cargos no esperados y busca aclaración completa y ajustes.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Revisión detallada", description: "Revisó cada concepto de la factura con el cliente", weight: 25 },
      { id: "2", name: "Explicación clara", description: "Explicó cargos con lenguaje simple y comprensible", weight: 30 },
      { id: "3", name: "Ajustes y compensación", description: "Ajustó cargos incorrectos apropiadamente", weight: 25 },
      { id: "4", name: "Prevención futura", description: "Activó alertas y controles para evitar recurrencia", weight: 20 }
    ],
    knowledge_base: "Cargos comunes en factura: 1) Servicios digitales = suscripciones activadas por SMS (se pueden cancelar), 2) Roaming = uso fuera de México (se puede bloquear), 3) Excedente datos = consumo sobre plan (se pueden agregar GB o activar alerta 80%). Política: si cargo es error de sistema se reversa 100%, si fue uso legítimo no informado se ofrece bono compensatorio. Herramientas: app Mi Cuenta para alertas de consumo.",
    custom_evaluation_instructions: "Verificar que el agente revisó factura línea por línea, explicó claramente origen de cada cargo, ajustó lo procedente y activó controles.",
    expected_outcome: "El cliente debe comprender perfectamente su factura, tener ajustes correctos aplicados y controles activos para evitar sorpresas futuras.",
    call_completion_rules: {
      success_message: "¡Caso cerrado satisfactoriamente! Cliente comprende su factura con ajustes y controles aplicados.",
      failure_message: "El cliente aún tiene dudas o no está satisfecho con ajustes. Revisa tu claridad explicativa y si ajustaste correctamente.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Venta de Plan 5G Premium con Roaming Internacional",
    description: "Eres un cliente profesional que viaja frecuentemente al extranjero (USA, Europa, Latinoamérica). Tu plan actual 4G no tiene roaming o es muy caro. Buscas upgrade a 5G con roaming incluido. Preguntas sobre cobertura 5G en tu ciudad, velocidades reales, en qué países funciona el roaming, cuántos GB incluye en roaming, costo del plan y si el equipo actual es compatible con 5G. Objetas el costo elevado del plan. Solo contratas si velocidad 5G justifica el precio, roaming cubre tus destinos frecuentes con suficientes GB (mínimo 5GB), precio es competitivo y ofrecen periodo de prueba o garantía de satisfacción.",
    category: "Ventas Móvil",
    difficulty: "advanced",
    duration_minutes: 20,
    client_personality: {
      type: "skeptical",
      description: "Profesional viajero exigente con tecnología y servicios internacionales",
      traits: ["tech-savvy", "viajero frecuente", "compara con operadores internacionales"]
    },
    objectives: [
      "Identificar patrón de viajes y destinos del cliente",
      "Presentar beneficios 5G con casos de uso reales",
      "Detallar cobertura de roaming en países relevantes",
      "Cerrar venta con garantía de experiencia"
    ],
    context: "Profesional con necesidades de conectividad internacional y tecnología de punta busca plan 5G con roaming.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Perfil de viajero", description: "Identificó destinos frecuentes y necesidades de roaming", weight: 20 },
      { id: "2", name: "Demostración 5G", description: "Explicó beneficios de 5G con casos de uso concretos", weight: 25 },
      { id: "3", name: "Cobertura internacional", description: "Detalló países con roaming y condiciones", weight: 25 },
      { id: "4", name: "Cierre premium", description: "Justificó inversión y cerró con garantía", weight: 30 }
    ],
    knowledge_base: "Plan 5G Premium $119,900 COP/mes: 50GB en México con 5G (velocidades hasta 1Gbps en zonas con cobertura), 10GB roaming en 50+ países (USA, Canadá, Europa, Latinoamérica), llamadas ilimitadas internacional, roaming de voz incluido. Dispositivos compatibles: iPhone 12+, Samsung S20+, últimos modelos Android. Cobertura 5G en principales ciudades de México. Garantía satisfacción 15 días (devuelves sin penalidad). Mapa de cobertura disponible en app.",
    custom_evaluation_instructions: "Evaluar si el agente demostró valor de tecnología 5G, aseguró cobertura en destinos del cliente y justificó inversión premium con beneficios tangibles.",
    expected_outcome: "El cliente debe comprender ventajas de 5G, tener certeza de roaming en sus destinos, percibir valor del plan y estar convencido de hacer el upgrade.",
    call_completion_rules: {
      success_message: "¡Venta 5G exitosa! Cliente profesional contrata plan premium con plena satisfacción de beneficios.",
      failure_message: "El cliente no percibió suficiente valor para justificar el costo. Refuerza beneficios 5G y cobertura internacional.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Venta de Línea Prepago con Paquetes de Redes Sociales",
    description: "Eres un cliente joven (18-25 años) que busca línea prepago económica. Usas principalmente redes sociales, WhatsApp, Instagram, TikTok, YouTube. No haces muchas llamadas. Preguntas sobre paquetes prepago, si incluyen apps ilimitadas, cuánto duran las recargas, cómo recargar, si pierdes saldo, y ofertas para primer recarga. Objetas que los paquetes sean caros o tengan pocos beneficios. Solo contratas si hay paquetes de $50-100 con redes sociales ilimitadas, proceso de compra es fácil (online), recarga dura mínimo 30 días y hay promoción de bienvenida atractiva.",
    category: "Ventas Móvil",
    difficulty: "beginner",
    duration_minutes: 12,
    client_personality: {
      type: "friendly",
      description: "Cliente joven buscando primera línea o plan económico para redes sociales",
      traits: ["joven", "orientado a apps", "presupuesto limitado"]
    },
    objectives: [
      "Identificar apps y servicios más usados por el cliente",
      "Presentar paquetes prepago con redes sociales ilimitadas",
      "Explicar proceso simple de compra y recarga",
      "Cerrar venta con promoción de bienvenida"
    ],
    context: "Cliente joven busca línea prepago económica enfocada en uso de redes sociales y mensajería.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Diagnóstico de uso", description: "Identificó apps y servicios más importantes para el cliente", weight: 20 },
      { id: "2", name: "Paquetes adaptados", description: "Presentó paquetes con redes sociales ilimitadas", weight: 30 },
      { id: "3", name: "Simplicidad de proceso", description: "Explicó compra y recarga de forma simple", weight: 20 },
      { id: "4", name: "Promoción de entrada", description: "Ofreció beneficio atractivo de bienvenida", weight: 30 }
    ],
    knowledge_base: "Paquetes Prepago Joven: $50,000 COP (1GB + redes sociales ilimitadas por 15 días), $100,000 COP (3GB + redes + 100 min por 30 días), $150,000 COP (5GB + redes + llamadas ilimitadas por 30 días). Redes incluidas: WhatsApp, Facebook, Instagram, TikTok, Twitter. Compra: online o tiendas. Recarga: app, tiendas, pagos digitales. Promoción primer recarga: GB dobles. Saldo no expira si recargas cada 60 días.",
    custom_evaluation_instructions: "Verificar que el agente identificó necesidades de redes sociales, presentó paquete apropiado económicamente y facilitó proceso de contratación.",
    expected_outcome: "El cliente debe sentir que el paquete se ajusta a su presupuesto y uso, el proceso es fácil y la promoción es atractiva para iniciar.",
    call_completion_rules: {
      success_message: "¡Venta prepago exitosa! Cliente joven contrata línea con paquete de redes sociales.",
      failure_message: "El cliente no se convenció del valor. Refuerza beneficios de redes ilimitadas y promoción de entrada.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Venta de Internet + Telefonía VoIP para Pequeño Negocio",
    description: "Eres dueño de un pequeño negocio (oficina, consultorio, tienda). Necesitas Internet confiable para operaciones y línea telefónica para clientes. Actualmente usas Internet residencial y celular como teléfono. Preguntas sobre Internet empresarial, velocidad simétrica, si incluyen telefonía VoIP, cuántas extensiones, si graban llamadas, costo de instalación y equipo. Objetas que sea muy caro para un negocio pequeño. Solo contratas si el paquete empresarial no cuesta más del 50% vs residencial, incluye telefonía con extensiones, tiene SLA de servicio y la instalación es rápida.",
    category: "Ventas Hogar",
    difficulty: "intermediate",
    duration_minutes: 18,
    client_personality: {
      type: "skeptical",
      description: "Empresario pequeño buscando solución profesional a precio razonable",
      traits: ["consciente de costos", "necesita confiabilidad", "valora profesionalismo"]
    },
    objectives: [
      "Identificar necesidades del negocio y operación",
      "Presentar paquete empresarial con telefonía incluida",
      "Justificar inversión con beneficios profesionales",
      "Cerrar venta con instalación programada"
    ],
    context: "Pequeño negocio requiere solución profesional de Internet y telefonía sin gastar como gran empresa.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Diagnóstico de negocio", description: "Identificó tipo de negocio y necesidades operativas", weight: 20 },
      { id: "2", name: "Propuesta empresarial", description: "Presentó paquete business con telefonía VoIP", weight: 30 },
      { id: "3", name: "Justificación de inversión", description: "Demostró ROI y beneficios profesionales", weight: 25 },
      { id: "4", name: "Cierre empresarial", description: "Cerró venta con agenda de instalación", weight: 25 }
    ],
    knowledge_base: "Paquete Negocio: Internet 100Mbps simétrico + Telefonía VoIP (3 extensiones) = $89,900 COP/mes. Incluye: router empresarial, teléfonos IP, grabación de llamadas, buzón de voz, transferencia de llamadas, música en espera. SLA 99% uptime. Soporte prioritario. Instalación $49,900 COP o GRATIS con permanencia 12 meses. Extensiones adicionales $15,000 COP/mes c/u. IP fija opcional +$20,000 COP/mes.",
    custom_evaluation_instructions: "Evaluar si el agente entendió necesidades de negocio, presentó solución profesional a precio justo y demostró valor para operaciones.",
    expected_outcome: "El cliente debe percibir valor profesional de la solución, sentir que el precio es justo para un negocio y estar motivado a contratar.",
    call_completion_rules: {
      success_message: "¡Venta empresarial exitosa! Pequeño negocio contrata solución profesional satisfactoriamente.",
      failure_message: "El cliente no justificó la inversión. Refuerza beneficios profesionales y comparativa vs soluciones improvisadas.",
      auto_close_on_failure: false
    }
  },
  {
    name: "Soporte: Configuración de APN y Datos Móviles",
    description: "Eres un cliente que no puede usar Internet móvil. Tus datos no funcionan aunque tienes saldo/plan activo. Has intentado reiniciar el teléfono sin éxito. Llamas frustrado porque necesitas usar apps urgentemente. Preguntas qué está mal, si es problema de la red o tu teléfono, cómo se soluciona, si tienen que enviarte configuración. No eres muy técnico así que necesitas guía paso a paso. Solo quedas satisfecho si recuperas tu Internet móvil durante la llamada con ayuda clara del asesor o te dan solución alternativa inmediata (WiFi gratuito, etc).",
    category: "Soporte Móvil",
    difficulty: "intermediate",
    duration_minutes: 15,
    client_personality: {
      type: "hurried",
      description: "Cliente urgido que necesita Internet móvil funcionando inmediatamente",
      traits: ["poco técnico", "impaciente", "necesita solución inmediata"]
    },
    objectives: [
      "Diagnosticar causa del problema de datos",
      "Guiar configuración de APN paso a paso",
      "Verificar que Internet móvil funcione antes de colgar",
      "Dejar documentado para futura referencia"
    ],
    context: "Cliente sin acceso a datos móviles necesita solución técnica inmediata con guía clara paso a paso.",
    voice_id: "",
    voice_name: "",
    knowledge_documents: [],
    is_active: true,
    evaluation_criteria: [
      { id: "1", name: "Diagnóstico rápido", description: "Identificó causa del problema (APN, configuración, etc)", weight: 25 },
      { id: "2", name: "Guía paso a paso", description: "Guió configuración con lenguaje simple y claro", weight: 30 },
      { id: "3", name: "Verificación de solución", description: "Verificó que Internet funcione antes de terminar", weight: 30 },
      { id: "4", name: "Seguimiento", description: "Envió configuración por SMS como respaldo", weight: 15 }
    ],
    knowledge_base: "Configuración APN: Nombre: internet.operadora, APN: internet.operadora.mx, Tipo APN: default,supl, Protocolo: IPv4/IPv6. Pasos: 1) Configuración > Redes móviles > APN > Nuevo APN, 2) Ingresar datos, 3) Guardar y seleccionar, 4) Activar/desactivar modo avión, 5) Probar navegación. Si no funciona: envío de configuración automática por SMS (código *888#) o verificar que datos móviles estén activos en configuración. Compensación por tiempo sin servicio: 1GB adicional.",
    custom_evaluation_instructions: "Verificar que el agente diagnosticó rápidamente, guió la configuración con paciencia, verificó funcionamiento y dejó respaldo de información.",
    expected_outcome: "El cliente debe tener Internet móvil funcionando al terminar la llamada, comprender qué se solucionó y tener respaldo de configuración.",
    call_completion_rules: {
      success_message: "¡Problema resuelto! Cliente recupera Internet móvil con configuración exitosa.",
      failure_message: "El cliente no recuperó servicio. Revisa tu diagnóstico y si la guía fue suficientemente clara.",
      auto_close_on_failure: false
    }
  }
];

export function usePredefinedScenarios() {
  return { predefinedScenarios: PREDEFINED_SCENARIOS };
}
