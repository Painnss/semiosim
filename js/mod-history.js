/* Módulo "Anamnesis e historia clínica": entrevista a un paciente virtual sano,
   cobertura por secciones, comunicación y método clínico. Shell propio (id: history). */
(function () {
  'use strict';
  const { esc } = U;

  const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  /* ------------------------------------------------------------------ CASOS */
  const CASES = [
    {
      id: 'h1', age: 28, sex: 'F', first: 'Ana', icon: '👩', diag: 'Entrevista normal',
      complaint: 'Consulta externa. Entrevista a la paciente y completa su historia clínica.',
      vitals: 'Talla 1,64 m · Peso 58 kg · IMC 21,6',
      ficha: {
        nombre: 'Ana Lucía Reyes Morales', nombreKw: [['ana'], ['reyes', 'morales']],
        civil: 'soltero', ocup: 'Diseñadora gráfica', ocupKw: [['disen', 'grafic']], convive: 'amigos', motivo: 'chequeo',
        enf: 'ninguna', cir: 'ninguna', ale: 'ninguna', med: 'acho', tab: 'nunca', alc: 'oca', eje: 'reg',
        fam: ['hta', 'dm', 'tiro'], ros: []
      }
    },
    {
      id: 'h2', age: 45, sex: 'M', first: 'Roberto', icon: '👨', diag: 'Entrevista normal',
      complaint: 'Consulta externa. Entrevista al paciente y completa su historia clínica.',
      vitals: 'Talla 1,76 m · Peso 77 kg · IMC 24,9',
      ficha: {
        nombre: 'Roberto Salazar Pineda', nombreKw: [['roberto'], ['salazar', 'pineda']],
        civil: 'casado', ocup: 'Ingeniero civil', ocupKw: [['ingenier']], convive: 'familia', motivo: 'chequeo',
        enf: 'ninguna', cir: 'apendice', ale: 'med', med: 'ninguna', tab: 'ex', alc: 'oca', eje: 'oca',
        fam: ['hta', 'dm', 'cardio'], ros: []
      }
    },
    {
      id: 'h3', age: 72, sex: 'M', first: 'Manuel', icon: '👴', diag: 'Entrevista normal',
      complaint: 'Consulta externa. Entrevista al paciente y completa su historia clínica.',
      vitals: 'Talla 1,68 m · Peso 72 kg · IMC 25,5',
      ficha: {
        nombre: 'Manuel Ortega Vidal', nombreKw: [['manuel'], ['ortega', 'vidal']],
        civil: 'casado', ocup: 'Maestro jubilado', ocupKw: [['maestr', 'profesor', 'docent']], convive: 'pareja', motivo: 'chequeo',
        enf: 'dislip', cir: 'hernia', ale: 'ninguna', med: 'ninguna', tab: 'nunca', alc: 'mod', eje: 'reg',
        fam: ['hta', 'dm', 'acv'], ros: []
      }
    }
  ];

  const OPT = {
    civil: [['soltero', 'Soltero/a'], ['casado', 'Casado/a'], ['union', 'Unión libre'], ['viudo', 'Viudo/a'], ['div', 'Divorciado/a']],
    convive: [['solo', 'Solo/a'], ['pareja', 'Con su pareja'], ['familia', 'Con pareja e hijos'], ['amigos', 'Con amigos o compañeros'], ['origen', 'Con su familia de origen']],
    motivo: [['chequeo', 'Control o chequeo sin síntomas'], ['dolor', 'Dolor'], ['fiebre', 'Fiebre'], ['resp', 'Tos o dificultad para respirar'], ['otro', 'Otro síntoma']],
    enf: [['ninguna', 'Ninguna'], ['hta', 'Hipertensión arterial'], ['dm', 'Diabetes'], ['asma', 'Asma'], ['dislip', 'Dislipidemia (colesterol alto)'], ['otra', 'Otra']],
    cir: [['ninguna', 'Ninguna'], ['apendice', 'Apendicectomía'], ['hernia', 'Hernia inguinal'], ['otra', 'Otra']],
    ale: [['ninguna', 'Ninguna conocida'], ['med', 'A medicamentos'], ['alim', 'A alimentos'], ['otra', 'Otra']],
    med: [['ninguna', 'Ninguna'], ['acho', 'Anticonceptivo oral'], ['antihta', 'Antihipertensivo'], ['hipolip', 'Hipolipemiante'], ['otra', 'Otra']],
    tab: [['nunca', 'Nunca ha fumado'], ['ex', 'Exfumador'], ['act', 'Fumador actual']],
    alc: [['nunca', 'Nunca'], ['oca', 'Ocasional (social)'], ['mod', 'Diario moderado (1 copa)'], ['exc', 'Excesivo']],
    eje: [['sed', 'Sedentario'], ['oca', 'Ocasional (1-2 veces/sem)'], ['reg', 'Regular (3 o más veces/sem)']]
  };
  const FAM = [['hta', 'HTA'], ['dm', 'Diabetes'], ['cardio', 'Cardiopatía isquémica'], ['ca', 'Cáncer'], ['acv', 'ACV'], ['tiro', 'Enf. tiroidea']];
  const ROSSYS = [['gen', 'General'], ['cv', 'Cardiovascular'], ['resp', 'Respiratorio'], ['dig', 'Digestivo'], ['gu', 'Genitourinario'],
    ['neu', 'Neurológico'], ['msk', 'Musculoesquelético'], ['piel', 'Piel'], ['end', 'Endocrino'], ['psi', 'Psiquiátrico']];
  const ROSNAME = { gen: 'General', cv: 'Cardiovascular', resp: 'Respiratorio', dig: 'Digestivo', gu: 'Genitourinario', neu: 'Neurológico',
    msk: 'Musculoesquelético', piel: 'Piel', end: 'Endocrino', psi: 'Psiquiátrico' };

  /* ------------------------------------------------------------ BANCO DE PREGUNTAS */
  // Q(id, grupo, texto, tipo 'o' abierta | 'c' cerrada, respuesta (texto | [caso1, caso2, caso3] | fn), extra {sex})
  const Q = (id, g, text, t, ans, x) => Object.assign({ id, g, text, t, ans }, x || {});
  const NO = s => s; // legibilidad

  const SECS = [
    {
      id: 'ident', name: 'Identificación y filiación', short: 'Filiación', qs: [
        Q('nom', '', '¿Cómo se llama? ¿Me dice su nombre completo?', 'c', ['Me llamo Ana Lucía Reyes Morales.', 'Roberto Salazar Pineda, para servirle.', 'Manuel Ortega Vidal.']),
        Q('edad', '', '¿Qué edad tiene y cuál es su fecha de nacimiento?', 'c', ['Tengo 28 años; nací el 14 de marzo de 1998.', 'Tengo 45 años; nací el 3 de julio de 1981.', 'Tengo 72 años; nací el 11 de enero de 1954.']),
        Q('civil', '', '¿Cuál es su estado civil?', 'c', ['Soltera, aunque tengo pareja estable desde hace tres años.', 'Casado desde hace 16 años.', 'Casado; llevo 47 años con mi esposa Carmen.']),
        Q('ocup', '', '¿A qué se dedica? ¿Cuál es su ocupación?', 'o', ['Soy diseñadora gráfica; trabajo por mi cuenta, casi siempre desde casa y a veces en el estudio de algún cliente.', 'Soy ingeniero civil; superviso obras y también paso tiempo en la oficina con planos y presupuestos.', 'Fui maestro de primaria durante 38 años; llevo siete años jubilado.']),
        Q('res', '', '¿Dónde vive y con quién vive?', 'o', ['Vivo en un departamento en la ciudad, que comparto con una amiga.', 'Vivo en una casa en un barrio urbano con mi esposa y mis dos hijos, de 12 y 9 años.', 'Vivo con mi esposa en nuestra casa de dos plantas; nuestros hijos viven cerca.']),
        Q('esc', '', '¿Hasta qué nivel estudió?', 'c', ['Terminé la carrera de diseño en la universidad.', 'Soy ingeniero titulado y tengo una maestría.', 'Hice la escuela normal de magisterio, estudios superiores.']),
        Q('acomp', '', '¿Ha venido acompañado/a hoy?', 'c', ['No, vine sola.', 'No, vine solo, directo desde el trabajo.', 'Me acompañó mi esposa, pero prefirió esperar afuera.'])
      ]
    },
    {
      id: 'motivo', name: 'Motivo de consulta', short: 'Motivo', qs: [
        Q('mot1', '', '¿Qué le trae hoy por aquí? ¿Cuál es el motivo de su consulta?', 'o', ['Vengo a mi chequeo anual. No tengo ninguna molestia; solo quiero que me revisen.', 'Vengo a mi chequeo médico anual que pide la empresa y, la verdad, también quería revisarme el corazón por mi papá.', 'Vengo a mi control de rutina, como todos los años. Me siento bien.']),
        Q('mot2', '', '¿Hay algo que le preocupe de su salud?', 'o', ['Nada en particular; quiero asegurarme de que todo está bien y preguntar por mi alimentación.', 'Un poco el corazón: mi papá tuvo un infarto y me da cierta inquietud.', 'Nada especial; quiero seguir activo y cuidar el colesterol.']),
        Q('mot3', '', '¿Tiene alguna molestia o síntoma en este momento?', 'c', 'No, ninguno. Me siento bien.'),
        Q('mot4', '', '¿Cuándo fue su último chequeo médico?', 'c', ['Hace un año; todo salió normal.', 'Hace un año y medio, también por el trabajo.', 'Hace unos ocho meses; voy una vez al año.']),
        Q('mot5', '', '¿Qué espera de esta consulta?', 'o', ['Que me confirmen que estoy sana y que me orienten para mantenerme bien.', 'Saber si tengo algún riesgo del corazón y cómo reducirlo.', 'Que me digan que todo sigue en orden y qué más puedo hacer para cuidarme.'])
      ]
    },
    {
      id: 'hea', name: 'Enfermedad actual (SOCRATES / OPQRST)', short: 'Enf. actual', qs: [
        Q('s', 'S · Sitio', 'Si tuviera alguna molestia, ¿en qué parte del cuerpo la siente?', 'o', 'En ninguna parte; no tengo ninguna molestia. Vengo solo por el control.'),
        Q('o', 'O · Inicio (Onset)', '¿Cuándo empezó la molestia y cómo, de golpe o poco a poco?', 'o', 'No hay nada que haya empezado; me siento igual que siempre.'),
        Q('c', 'C · Carácter', '¿Cómo es la molestia: punzante, opresiva, ardor, cólico?', 'c', 'No tengo ninguna molestia que describir.'),
        Q('r', 'R · Radiación', '¿Se irradia hacia algún otro sitio?', 'c', 'No, no tengo ningún dolor que se irradie.'),
        Q('a', 'A · Síntomas asociados', '¿Se acompaña de fiebre, náuseas, falta de aire o sudores?', 'c', 'No, no he tenido fiebre, náuseas, falta de aire ni sudores.'),
        Q('t', 'T · Tiempo / curso', '¿Es constante o va y viene? ¿Cuánto dura cada episodio?', 'o', 'No tengo ningún síntoma, ni constante ni intermitente.'),
        Q('e', 'E · Exacerbantes / atenuantes', '¿Qué la mejora y qué la empeora?', 'o', 'No hay nada que me mejore ni me empeore, porque no tengo molestias.'),
        Q('sev', 'S · Severidad', 'Del 0 al 10, ¿qué intensidad tiene la molestia?', 'c', 'Del 0 al 10, un 0: no tengo dolor.'),
        Q('cambio', 'Cambios recientes', '¿Ha notado algún cambio reciente en su salud, su peso o su energía?', 'c', ['No, mi peso y mi energía están estables.', 'No he notado cambios; me siento como siempre.', 'No, nada distinto; sigo con mis actividades de siempre.']),
        Q('trat', 'Cambios recientes', '¿Ha tomado algún medicamento o remedio para algo en los últimos días?', 'c', ['Solo mi anticonceptivo de siempre; nada para ninguna molestia.', 'Nada, ni pastillas ni remedios.', 'Nada, ni siquiera un paracetamol en estos días.']),
        Q('falta', 'Cambios recientes', '¿Ha tenido que faltar al trabajo o dejar actividades por algún problema de salud?', 'c', ['No, no he faltado al trabajo por enfermedad.', 'No, ni un día este año.', 'No, hace años que no dejo mis actividades por salud.'])
      ]
    },
    {
      id: 'ap', name: 'Antecedentes personales', short: 'Ant. personales', qs: [
        Q('ap1', 'Patológicos', '¿Tiene alguna enfermedad diagnosticada (presión alta, diabetes, asma, colesterol alto...)?', 'c', ['No, ninguna enfermedad diagnosticada; mi presión y mi azúcar han salido normales.', 'No tengo ninguna enfermedad diagnosticada; mi presión ha salido normal en los chequeos.', 'Solo el colesterol algo alto, que controlo con dieta y ejercicio. De presión y de azúcar estoy bien.']),
        Q('ap2', 'Patológicos', '¿Qué enfermedades importantes ha tenido a lo largo de su vida?', 'o', ['De niña, varicela y alguna amigdalitis; nada importante después.', 'De niño tuve varicela y sarampión; de adulto, resfriados fuertes, nada más.', 'Las de la infancia, y hace unos 30 años una neumonía que se curó bien. Fuera de eso, el colesterol.']),
        Q('ap3', 'Patológicos', '¿Ha estado hospitalizado/a alguna vez?', 'c', ['No, nunca me han ingresado.', 'Solo cuando me operaron del apéndice, a los 19 años.', 'Dos días cuando me operaron de la hernia, hace unos veinte años.']),
        Q('ap4', 'Patológicos', '¿Ha recibido alguna transfusión de sangre?', 'c', 'No, nunca he recibido transfusiones.'),
        Q('ap5', 'Quirúrgicos y traumáticos', '¿Le han operado alguna vez?', 'c', ['No, nunca me han operado.', 'Sí, de apendicitis a los 19 años; sin complicaciones.', 'Sí, de una hernia inguinal del lado derecho a los 52 años; salió todo bien.']),
        Q('ap6', 'Quirúrgicos y traumáticos', '¿Ha tenido fracturas, accidentes o golpes importantes?', 'c', ['No, nunca me he roto un hueso.', 'Me fracturé la muñeca izquierda jugando fútbol a los 16 años; sanó bien.', 'Ninguna fractura; algún esguince de tobillo hace años.']),
        Q('ap7', 'Alergias', '¿Es alérgico/a a algún medicamento?', 'c', ['No, que yo sepa no soy alérgica a ningún medicamento.', 'Sí, a la penicilina: de niño me salió urticaria (ronchas) con una inyección. Desde entonces no me la dan.', 'No, nunca he tenido reacciones a medicamentos.']),
        Q('ap8', 'Alergias', '¿Tiene alergia a alimentos, polen, látex o picaduras?', 'c', 'No, a nada más.'),
        Q('ap9', 'Medicación', '¿Toma algún medicamento de forma habitual?', 'c', ['Solo el anticonceptivo oral, una pastilla al día, desde hace tres años.', 'No tomo ningún medicamento de forma regular.', 'Ninguno de forma regular; un paracetamol si me duele la cabeza una vez al año, más o menos.']),
        Q('ap10', 'Medicación', '¿Usa vitaminas, suplementos, productos naturales o se automedica?', 'c', ['A veces un multivitamínico; nada más.', 'No, nada de eso.', 'Vitamina D en invierno, por recomendación de mi médico.']),
        Q('ap11', 'Hábitos', '¿Fuma o ha fumado alguna vez? ¿Cuántos cigarrillos al día y durante cuántos años?', 'c', ['No, nunca he fumado.', 'Fumé unos 5 cigarrillos al día, de los 20 a los 30 años. Lo dejé hace 15 años y no he vuelto a fumar.', 'No, nunca he fumado.']),
        Q('ap12', 'Hábitos', '¿Con qué frecuencia toma bebidas alcohólicas y cuánto?', 'c', ['Una o dos copas de vino algún fin de semana, en reuniones.', 'Dos o tres cervezas los fines de semana, con amigos.', 'Una copa de vino con la comida, a diario.']),
        Q('ap13', 'Hábitos', '¿Consume alguna droga o sustancia recreativa?', 'c', 'No, nunca he consumido drogas.'),
        Q('ap14', 'Hábitos', '¿Hace ejercicio? ¿Qué tipo y con qué frecuencia?', 'o', ['Hago yoga tres veces por semana, una hora, y salgo a caminar casi todos los días.', 'Juego fútbol los domingos y camino 30 minutos un par de veces por semana; sé que debería hacer más.', 'Camino 40 minutos todas las mañanas y cuido el huerto; subo escaleras sin problema.']),
        Q('ap15', 'Hábitos', '¿Cómo es su alimentación en un día normal?', 'o', ['Como de todo: muchas verduras y fruta, legumbres, pollo y pescado; poca carne roja y pocos dulces.', 'Desayuno café con pan, almuerzo casi siempre fuera, a veces fritos, y ceno en casa. Me paso un poco con la sal y los refrescos.', 'Dieta mediterránea: verduras, pescado, legumbres y aceite de oliva; poca sal y pocos embutidos.']),
        Q('ap16', 'Hábitos', '¿Cómo duerme? ¿Cuántas horas y descansa bien?', 'o', ['Duermo 7 u 8 horas y descanso bien.', 'Duermo unas 6 o 7 horas; entre semana madrugo mucho, pero me levanto descansado.', 'Me acuesto a las 11 y me levanto a las 6:30; duermo de un tirón y descanso bien.']),
        Q('ap17', 'Hábitos', '¿Cuántos cafés o bebidas con cafeína toma al día?', 'c', ['Uno o dos cafés al día.', 'Tres cafés al día, sobre todo por la mañana.', 'Un café con leche en el desayuno, nada más.']),
        Q('go1', 'Ginecoobstétricos', '¿A qué edad tuvo su primera menstruación?', 'c', 'A los 12 años.', { sex: 'F' }),
        Q('go2', 'Ginecoobstétricos', '¿Cómo son sus ciclos menstruales (duración, regularidad, cantidad, dolor)?', 'o', 'Con la pastilla tengo el sangrado regular, cada 28 días; dura 4 o 5 días, es moderado y sin dolor importante.', { sex: 'F' }),
        Q('go3', 'Ginecoobstétricos', '¿Cuándo fue su última menstruación?', 'c', 'Me empezó hace unas dos semanas.', { sex: 'F' }),
        Q('go4', 'Ginecoobstétricos', '¿Ha estado embarazada? ¿Cuántos embarazos, partos o abortos?', 'c', 'Nunca he estado embarazada: cero embarazos, cero partos, cero abortos.', { sex: 'F' }),
        Q('go5', 'Ginecoobstétricos', '¿Usa algún método anticonceptivo?', 'c', 'Tomo anticonceptivo oral combinado, una pastilla diaria, y uso preservativo con mi pareja.', { sex: 'F' }),
        Q('go6', 'Ginecoobstétricos', '¿Cuándo fue su última citología (Papanicolaou)?', 'c', 'Me la hice hace un año y salió normal.', { sex: 'F' }),
        Q('sx', 'Historia sexual', '¿Tiene una vida sexual activa? ¿Usa protección?', 'c', ['Sí, con mi pareja estable desde hace tres años; usamos preservativo y yo tomo la pastilla. Nunca he tenido infecciones.', 'Sí, con mi esposa; relación estable y satisfactoria, sin problemas.', 'Sí, con mi esposa, con normalidad y sin molestias.']),
        Q('va1', 'Vacunas', '¿Tiene su esquema de vacunación completo?', 'c', ['Sí, tengo todas las de la infancia y la del virus del papiloma humano.', 'Sí, las de la infancia y la de la hepatitis B.', 'Sí, las de la infancia y las que me ha recomendado mi médico.']),
        Q('va2', 'Vacunas', '¿Cuándo fue su última vacuna antitetánica?', 'c', ['Me pusieron el refuerzo hace dos años.', 'Hace seis años, cuando me hice una herida en una obra.', 'Hace ocho años me pusieron la Td (tétanos y difteria).']),
        Q('va3', 'Vacunas', '¿Se vacuna contra la gripe y el COVID-19?', 'c', ['Me vacuno de la gripe cada año y tengo el esquema de COVID-19 con refuerzo.', 'Me vacuné de la gripe el año pasado y tengo el esquema de COVID-19 completo.', 'Me pongo la de la gripe cada otoño y tengo cuatro dosis de COVID-19.']),
        Q('va4', 'Vacunas', '¿Se ha vacunado contra el neumococo o el herpes zóster?', 'c', ['Todavía no me corresponden.', 'Aún no me corresponden; mi médico me dijo que más adelante.', 'Sí: neumococo hace tres años y las dos dosis de la vacuna del zóster hace un año.'])
      ]
    },
    {
      id: 'af', name: 'Antecedentes familiares', short: 'Ant. familiares', qs: [
        Q('af1', '', '¿Hay alguna enfermedad que se repita en su familia?', 'o', ['En mi familia hay algo de tiroides y de diabetes; nada grave.', 'Sí: del corazón y la presión por parte de mi papá, y diabetes por parte de mi mamá.', 'Hipertensión y algo de diabetes; nada más importante.']),
        Q('af2', '', '¿Viven sus padres? ¿Qué enfermedades tienen o de qué fallecieron?', 'o', ['Mi madre tiene 55 años y toma pastillas para el tiroides (hipotiroidismo). Mi padre tiene 58 y la presión alta, controlada.', 'Mi padre falleció a los 72 años de un infarto; tenía la presión alta. Mi madre tiene 70 años y diabetes tipo 2.', 'Mi padre murió a los 80 años de una neumonía. Mi madre era hipertensa y falleció a los 86 por un derrame cerebral.']),
        Q('af3', '', '¿Tiene hermanos o hijos? ¿Están sanos?', 'c', ['Tengo un hermano de 25 años, sano.', 'Tengo una hermana sana y dos hijos sanos.', 'Tengo un hermano mayor con diabetes tipo 2 y dos hijos sanos.']),
        Q('af4', '', '¿Algún familiar con diabetes, hipertensión o enfermedad del corazón?', 'c', ['Mi abuela materna tuvo diabetes tipo 2 y mi padre tiene la presión alta.', 'Sí: mi padre tuvo hipertensión e infarto; mi madre, diabetes.', 'Sí: hipertensión en mi madre y diabetes en mi hermano.']),
        Q('af5', '', '¿Algún familiar con cáncer? ¿De qué tipo y a qué edad?', 'c', 'No, que yo sepa nadie en mi familia ha tenido cáncer.'),
        Q('af6', '', '¿Algún familiar con enfermedad tiroidea, asma, enfermedades hereditarias o psiquiátricas?', 'c', ['Mi madre tiene hipotiroidismo; no hay enfermedades hereditarias ni psiquiátricas que yo sepa.', 'No, nada de eso.', 'No, nada de eso en mi familia.']),
        Q('af7', '', '¿Alguien de su familia ha fallecido de forma repentina o a edad temprana?', 'c', ['No, nadie ha fallecido de forma repentina ni joven.', 'Mi padre murió de infarto a los 72 años, no tan joven; nadie más de forma repentina.', 'No, que yo sepa.'])
      ]
    },
    {
      id: 'ps', name: 'Historia psicosocial, laboral y vivienda', short: 'Psicosocial', qs: [
        Q('ps1', '', '¿Cómo es su entorno familiar y quién le apoya?', 'o', ['Tengo buen apoyo: mis padres y mi pareja; veo a mi familia cada fin de semana.', 'Mi esposa y mis hijos son mi apoyo; tengo buena relación con todos.', 'Vivo con mi esposa y vemos a nuestros hijos y nietos cada semana; me siento muy acompañado.']),
        Q('ps2', '', '¿Cómo es su trabajo: horario, esfuerzo físico, exposición a polvo, químicos o ruido?', 'o', ['Trabajo unas 8 o 9 horas frente a la pantalla, con pausas; paso mucho tiempo sentada y a veces tengo plazos de entrega.', 'Trabajo 9 horas: parte del día en obra, con casco y protección auditiva, algo de polvo, y parte en la oficina. Camino bastante.', 'Ya no trabajo; antes enseñaba de pie muchas horas. Ahora tengo mis actividades y mi huerto.']),
        Q('ps3', '', '¿Cómo es su vivienda: agua potable, saneamiento, ventilación, mascotas?', 'o', ['Mi departamento tiene agua potable, drenaje y buena ventilación; tengo un gato vacunado.', 'Casa con agua potable, drenaje y luz, sin humedad. Tenemos un perro vacunado.', 'Casa propia con agua potable, buena ventilación y sin humedad; escaleras con barandilla. Sin mascotas.']),
        Q('ps4', '', '¿Cómo está de ánimo últimamente? ¿Siente estrés?', 'o', ['Mi ánimo es bueno; el estrés es normal por las entregas, pero lo manejo con yoga.', 'Bien de ánimo; algo de estrés por los plazos de las obras, pero nada que me desborde.', 'Me siento animado y tranquilo; participo en un club de ajedrez y en un voluntariado.']),
        Q('ps5', '', '¿Cómo es un día típico para usted?', 'o', ['Me levanto a las 7, hago yoga o camino, trabajo por la mañana y por la tarde, y por la noche leo o veo series.', 'Me levanto a las 5:30, voy a la obra, como fuera, regreso a las 7 de la tarde y ceno con mi familia.', 'Camino por la mañana, me ocupo del huerto, almuerzo con mi esposa, leo y juego ajedrez por la tarde.']),
        Q('ps6', '', '¿Se siente seguro/a en casa y en su entorno? ¿Ha sufrido algún tipo de violencia?', 'c', 'Sí, me siento seguro/a en casa y fuera; nunca he sufrido violencia.'),
        Q('ps7', '', '¿Ha viajado recientemente fuera de su ciudad o de su país?', 'c', ['No he viajado fuera del país en el último año.', 'He viajado a otra ciudad por trabajo, pero no al extranjero ni a zonas con enfermedades tropicales.', 'No he viajado, salvo ir a la costa unos días en verano.']),
        Q('ps8', '', '¿Usa cinturón de seguridad, casco y protección solar?', 'c', ['Sí: casco cuando voy en bici, cinturón en el coche y protector solar.', 'Siempre uso cinturón al conducir y casco en la obra.', 'Sí, siempre uso cinturón y no manejo de noche.']),
        Q('ps9', '', '¿Tiene seguro médico o cómo accede a la atención de salud?', 'c', ['Tengo seguro médico privado y me alcanza para mis gastos.', 'Tengo seguro médico a través de la empresa.', 'Tengo la cobertura de la seguridad social por mi jubilación y mis ahorros me alcanzan.']),
        Q('ps10', '', '¿Es independiente para sus actividades diarias? ¿Ha tenido caídas?', 'c', ['Sí, totalmente independiente y sin caídas.', 'Sí, totalmente independiente y sin caídas.', 'Soy completamente independiente para todo y no he tenido caídas en el último año.'])
      ]
    },
    {
      id: 'ros', name: 'Revisión por aparatos y sistemas', short: 'Revisión sistemas', qs: [
        Q('g1', 'General', '¿Ha tenido fiebre o escalofríos?', 'c', 'No, no he tenido fiebre ni escalofríos.'),
        Q('g2', 'General', '¿Ha perdido o ganado peso sin proponérselo?', 'c', ['No, mi peso se mantiene en unos 58 kilos.', 'No, peso unos 77 kilos desde hace años.', 'No, me mantengo en 72 kilos.']),
        Q('g3', 'General', '¿Se siente más cansado/a de lo habitual?', 'c', 'No, tengo energía normal para mi día a día.'),
        Q('g4', 'General', '¿Cómo está su apetito?', 'o', 'Mi apetito es normal.'),
        Q('g5', 'General', '¿Suda por la noche sin motivo?', 'c', 'No, no sudo por la noche.'),
        Q('c1', 'Cardiovascular', '¿Ha sentido dolor u opresión en el pecho?', 'c', 'No, nunca he sentido dolor ni opresión en el pecho.'),
        Q('c2', 'Cardiovascular', '¿Siente que el corazón late rápido o raro sin hacer esfuerzo?', 'c', 'No, solo se acelera cuando hago ejercicio, como a todos.'),
        Q('c3', 'Cardiovascular', '¿Se queda sin aire al subir escaleras o caminar rápido?', 'c', ['No, subo escaleras y hago ejercicio sin quedarme sin aire.', 'No, subo escaleras sin problema.', 'Subo dos pisos a mi ritmo, sin quedarme sin aire.']),
        Q('c4', 'Cardiovascular', '¿Necesita varias almohadas para dormir o se despierta con falta de aire?', 'c', 'No, duermo con una almohada y no me despierto con falta de aire.'),
        Q('c5', 'Cardiovascular', '¿Se le hinchan los pies o los tobillos?', 'c', 'No, nunca se me hinchan.'),
        Q('c6', 'Cardiovascular', '¿Se ha desmayado o ha estado a punto de hacerlo?', 'c', 'No, nunca me he desmayado.'),
        Q('c7', 'Cardiovascular', '¿Le duelen las piernas al caminar y se le quita al descansar?', 'c', 'No, camino mucho sin dolor en las piernas.'),
        Q('r1', 'Respiratorio', '¿Tiene tos?', 'c', 'No tengo tos ahora ni la he tenido últimamente.'),
        Q('r2', 'Respiratorio', '¿Saca flemas o secreciones al toser?', 'c', 'No, no tengo flemas.'),
        Q('r3', 'Respiratorio', '¿Le falta el aire estando en reposo?', 'c', 'No, respiro bien en reposo.'),
        Q('r4', 'Respiratorio', '¿Le silba el pecho al respirar?', 'c', 'No, no me silba el pecho.'),
        Q('r5', 'Respiratorio', '¿Ha tosido con sangre alguna vez?', 'c', 'No, nunca he tosido con sangre.'),
        Q('d1', 'Digestivo', '¿Tiene dificultad o dolor al tragar?', 'c', 'No, trago bien sólidos y líquidos.'),
        Q('d2', 'Digestivo', '¿Siente acidez o ardor que sube desde el estómago?', 'c', 'No, no tengo acidez ni ardor.'),
        Q('d3', 'Digestivo', '¿Ha tenido náuseas o vómitos?', 'c', 'No, ni náuseas ni vómitos.'),
        Q('d4', 'Digestivo', '¿Le duele el abdomen (la barriga)?', 'c', 'No, no me duele la barriga.'),
        Q('d5', 'Digestivo', '¿Cómo es su hábito intestinal: frecuencia y aspecto de las heces?', 'o', ['Voy al baño una vez al día; las heces son normales, de color marrón.', 'Voy al baño una vez al día, por la mañana, con heces normales.', 'Voy una vez al día, con heces normales; sin estreñimiento ni diarrea.']),
        Q('d6', 'Digestivo', '¿Ha visto heces negras o con sangre?', 'c', 'No, nunca he visto heces negras ni con sangre.'),
        Q('d7', 'Digestivo', '¿Ha notado la piel o los ojos amarillos?', 'c', 'No, nunca.'),
        Q('u1', 'Genitourinario', '¿Le arde o le duele al orinar?', 'c', 'No, no me arde al orinar.'),
        Q('u2', 'Genitourinario', '¿Cuántas veces orina al día y se levanta de noche a orinar?', 'c', ['Unas 5 o 6 veces al día y no me levanto de noche.', 'Unas 5 o 6 veces al día y no me levanto de noche.', 'Unas 6 veces al día y no me levanto por la noche.']),
        Q('u3', 'Genitourinario', '¿Ha visto sangre en la orina?', 'c', 'No, nunca he visto sangre en la orina.'),
        Q('u4', 'Genitourinario', '¿Se le escapa la orina sin querer?', 'c', 'No, no se me escapa.'),
        Q('u5', 'Genitourinario', '¿Tiene flujo vaginal anormal, dolor pélvico o sangrado fuera de la regla?', 'c', 'No, no tengo flujo anormal, ni dolor pélvico, ni sangrados fuera de la regla.', { sex: 'F' }),
        Q('u6', 'Genitourinario', '¿Tiene dificultad para iniciar el chorro, dolor testicular o secreción por la uretra?', 'c', 'No, el chorro es normal, sin esfuerzo ni goteo al final; sin dolor testicular ni secreción.', { sex: 'M' }),
        Q('n1', 'Neurológico', '¿Tiene dolores de cabeza?', 'c', 'No, no tengo dolores de cabeza importantes.'),
        Q('n2', 'Neurológico', '¿Siente mareos o que todo da vueltas?', 'c', 'No, no tengo mareos ni sensación de giro.'),
        Q('n3', 'Neurológico', '¿Ha perdido el conocimiento o ha tenido convulsiones?', 'c', 'No, nunca.'),
        Q('n4', 'Neurológico', '¿Siente hormigueos o adormecimiento en brazos o piernas?', 'c', 'No, no tengo hormigueos ni adormecimientos.'),
        Q('n5', 'Neurológico', '¿Nota debilidad o pesadez en algún brazo o pierna?', 'c', 'No, no noto debilidad.'),
        Q('n6', 'Neurológico', '¿Ve y oye bien?', 'c', ['Sí, veo y oigo bien.', 'Sí, veo y oigo bien.', 'Uso gafas para leer de cerca, pero veo y oigo bien para mi edad.']),
        Q('n7', 'Neurológico', '¿Tiene temblores o problemas de memoria?', 'c', ['No, ni temblores ni problemas de memoria.', 'No, ni temblores ni problemas de memoria.', 'Mi memoria está bien; a veces se me olvida un nombre, como a todos, pero nada que afecte mi día.']),
        Q('m1', 'Musculoesquelético', '¿Le duelen las articulaciones?', 'c', 'No, no me duelen las articulaciones.'),
        Q('m2', 'Musculoesquelético', '¿Amanece con las articulaciones tiesas?', 'c', 'No, no amanezco con rigidez.'),
        Q('m3', 'Musculoesquelético', '¿Tiene dolor de espalda o de cuello?', 'c', ['No; me estiro cada hora cuando trabajo sentada.', 'No, no tengo dolor de espalda ni de cuello.', 'No, no tengo dolor de espalda ni de cuello.']),
        Q('m4', 'Musculoesquelético', '¿Se le hincha o se le bloquea alguna articulación?', 'c', 'No, me muevo sin limitación.'),
        Q('m5', 'Musculoesquelético', '¿Tiene calambres frecuentes o debilidad muscular?', 'c', 'No, no tengo calambres frecuentes ni debilidad.'),
        Q('p1', 'Piel', '¿Ha notado lunares nuevos o que hayan cambiado de forma o color?', 'c', 'No he notado lunares nuevos ni cambios.'),
        Q('p2', 'Piel', '¿Tiene picor, ronchas o erupciones en la piel?', 'c', 'No, no me pica ni me salen ronchas.'),
        Q('p3', 'Piel', '¿Se le cae el pelo o tiene cambios en las uñas?', 'c', 'No, el pelo y las uñas están normales.'),
        Q('e1', 'Endocrino', '¿Tiene más sed de lo normal o orina en exceso?', 'c', 'No, no tengo más sed de lo habitual ni orino en exceso.'),
        Q('e2', 'Endocrino', '¿Tolera bien el frío y el calor?', 'c', 'Sí, los tolero como los demás.'),
        Q('e3', 'Endocrino', '¿Tiene sudores excesivos, temblor o palpitaciones sin causa?', 'c', 'No, nada de eso.'),
        Q('e4', 'Endocrino', '¿Ha notado cambios en la voz, el pelo o el cuello (bulto)?', 'c', 'No, no he notado cambios.'),
        Q('y1', 'Psiquiátrico', '¿Se ha sentido triste, sin ganas o sin interés por sus cosas?', 'c', 'No, disfruto de mis actividades y me siento con ánimo.'),
        Q('y2', 'Psiquiátrico', '¿Se siente nervioso/a o con angustia con frecuencia?', 'c', ['No; solo me pongo algo nerviosa en las entregas, como cualquiera.', 'No, estoy tranquilo; solo algo de estrés en el trabajo.', 'No, estoy tranquilo.']),
        Q('y3', 'Psiquiátrico', '¿Tiene dificultad para dormir?', 'c', 'No, duermo bien.'),
        Q('y4', 'Psiquiátrico', '¿Ha tenido pensamientos de hacerse daño o de que no vale la pena vivir?', 'c', 'No, nunca he tenido pensamientos así.')
      ]
    }
  ];

  // Variante con jerga técnica (el paciente no la entiende)
  const JARG = {
    c3: '¿Presenta disnea de esfuerzo?', c4: '¿Tiene ortopnea o disnea paroxística nocturna?', c5: '¿Presenta edemas en miembros inferiores?',
    c6: '¿Ha tenido síncope o presíncope?', c7: '¿Refiere claudicación intermitente?', c2: '¿Refiere palpitaciones?',
    r2: '¿Tiene expectoración?', r4: '¿Presenta sibilancias?', r5: '¿Ha tenido hemoptisis?',
    d1: '¿Refiere disfagia u odinofagia?', d2: '¿Tiene pirosis o regurgitación?', d6: '¿Ha presentado melenas o rectorragia?', d7: '¿Ha observado ictericia?',
    u1: '¿Presenta disuria o tenesmo vesical?', u2: '¿Tiene polaquiuria o nicturia?', u3: '¿Ha tenido hematuria?', u4: '¿Presenta incontinencia urinaria?',
    n2: '¿Refiere vértigo o mareo?', n3: '¿Ha tenido crisis convulsivas o síncope?', n4: '¿Presenta parestesias?', n5: '¿Tiene paresia o hipostenia?',
    m1: '¿Refiere artralgias?', m2: '¿Tiene rigidez matinal de las articulaciones?', m4: '¿Presenta tumefacción articular o limitación funcional?',
    p1: '¿Ha observado cambios en algún nevus?', p2: '¿Tiene prurito o exantema?',
    e1: '¿Refiere polidipsia o poliuria?', e2: '¿Tiene intolerancia al frío o al calor?', e3: '¿Presenta hiperhidrosis o temblor?',
    y1: '¿Tiene anhedonia o ánimo depresivo?', y4: '¿Ha tenido ideación autolítica?', g5: '¿Presenta diaforesis nocturna?', g2: '¿Ha presentado pérdida ponderal involuntaria?',
    ap1: '¿Tiene comorbilidades o enfermedades de base?', ap3: '¿Tiene antecedentes de ingreso hospitalario?', ap13: '¿Consume sustancias psicoactivas?'
  };

  const ALLQ = [];
  SECS.forEach(s => s.qs.forEach(q => { q.sec = s.id; ALLQ.push(q); }));
  const QBYID = {};
  ALLQ.forEach(q => { QBYID[q.id] = q; });

  const ansFor = (q, c) => {
    const i = CASES.indexOf(c);
    let a = q.ans;
    if (typeof a === 'function') a = a(c);
    if (Array.isArray(a)) a = a[i] != null ? a[i] : a[0];
    // concordancia de género en frases neutras
    a = a.replace(/o\/a\b/g, c.sex === 'F' ? 'a' : 'o');
    return a;
  };
  const qText = (q, c) => q.text.replace(/o\/a\b/g, c.sex === 'F' ? 'a' : 'o');

  const qsFor = (sec, c) => sec.qs.filter(q => !q.sex || q.sex === c.sex);

  /* ------------------------------------------------------------------ ESTILOS */
  function injectCSS() {
    if (document.getElementById('his-style')) return;
    const st = document.createElement('style');
    st.id = 'his-style';
    st.textContent = `
    .his-wrap{display:grid;grid-template-columns:minmax(230px,320px) minmax(0,1fr);background:var(--panel);color:var(--ink);min-height:580px}
    @media (max-width:820px){.his-wrap{grid-template-columns:1fr}.his-side{border-right:0!important;border-bottom:1px solid var(--line);max-height:320px!important}}
    .his-side{border-right:1px solid var(--line);padding:10px;max-height:640px;overflow:auto}
    .his-secs{display:flex;flex-wrap:wrap;gap:4px;margin-bottom:8px}
    .his-sec{border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:999px;padding:3px 9px;font-size:12px;cursor:pointer}
    .his-sec.on{background:var(--brand);color:var(--brand-ink);border-color:var(--brand);font-weight:600}
    .his-sec small{opacity:.8;margin-left:4px}
    .his-grp{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted);margin:10px 0 3px}
    .his-q{display:flex;gap:6px;align-items:flex-start;width:100%;text-align:left;background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:6px 8px;margin-bottom:4px;cursor:pointer;font-size:13.5px;color:var(--ink)}
    .his-q:hover{border-color:var(--brand)}
    .his-q.done{opacity:.62}
    .his-q .tick{width:16px;flex:none;color:var(--ok);font-weight:700}
    .his-q .tag{margin-left:auto;flex:none;font-size:10.5px;border:1px solid var(--line);border-radius:6px;padding:0 5px;color:var(--muted)}
    .his-chat{display:flex;flex-direction:column;min-width:0}
    .his-head{padding:8px 12px;border-bottom:1px solid var(--line);font-weight:600}
    .his-msgs{flex:1;overflow:auto;padding:10px 12px;height:380px}
    .his-b{max-width:84%;padding:7px 11px;border-radius:14px;margin:6px 0;font-size:14px;line-height:1.4;border:1px solid var(--line);background:var(--bg);color:var(--ink)}
    .his-b.dr{margin-left:auto;background:var(--soft);border-color:var(--brand)}
    .his-b.sys{margin:8px auto;text-align:center;font-size:12.5px;color:var(--muted);background:transparent;border-style:dashed}
    .his-b small{display:block;color:var(--muted);font-size:11px;margin-bottom:2px}
    .his-act{display:flex;flex-wrap:wrap;gap:5px;padding:6px 10px;border-top:1px solid var(--line)}
    .his-act button{border:1px solid var(--brand);background:transparent;color:var(--brand);border-radius:8px;padding:3px 9px;font-size:12.5px;cursor:pointer}
    .his-act button:hover{background:var(--soft)}
    .his-tips{padding:8px 12px;border-top:1px solid var(--line);background:var(--soft);font-size:13px}
    .his-tips ul{margin:4px 0 0;padding-left:18px}
    .his-pane{padding:14px;background:var(--panel);color:var(--ink);min-height:540px}
    .his-pane h4{margin:14px 0 6px;font-size:13px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}
    .his-bar{display:grid;grid-template-columns:150px 1fr 44px;gap:8px;align-items:center;margin:5px 0;font-size:13px}
    .his-bar .tr{height:10px;border-radius:6px;background:var(--bg);border:1px solid var(--line);overflow:hidden}
    .his-bar .fl{height:100%;background:var(--brand)}
    .his-chk{list-style:none;padding:0;margin:0;font-size:13.5px}
    .his-chk li{padding:3px 0}
    .his-tile{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--line);background:var(--bg);color:var(--ink);border-radius:10px;padding:8px 12px;margin:3px;cursor:pointer;font-size:14px}
    .his-tile:hover{border-color:var(--brand)}
    .his-tile.used{opacity:.4;pointer-events:none}
    .his-seq{display:flex;flex-wrap:wrap;gap:6px;min-height:44px;border:1px dashed var(--line);border-radius:10px;padding:6px;margin:6px 0}
    .his-seq span{background:var(--soft);border:1px solid var(--brand);border-radius:8px;padding:4px 10px;font-size:13.5px}
    .his-fb{margin:8px 0;padding:8px 10px;border-radius:8px;font-size:13.5px}
    .his-fb.ok{background:var(--ok-bg);color:var(--ok)} .his-fb.bad{background:var(--bad-bg);color:var(--bad)}
    .his-in{width:100%;padding:5px 8px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink);font:inherit}
    .his-rec select{width:100%;padding:4px 6px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--ink)}
    .his-rec h5{margin:12px 0 2px;font-size:12px;text-transform:uppercase;letter-spacing:.05em;color:var(--brand)}
    .his-chkgrid{display:grid;grid-template-columns:1fr 1fr;gap:2px 8px;font-size:13px}
    .his-chkgrid label{display:flex;gap:5px;align-items:center;cursor:pointer}
    `;
    document.head.appendChild(st);
  }

  /* -------------------------------------------------------------------- MÓDULO */
  function mount(root) {
    injectCSS();
    const S = {
      c: null, ci: 0, asked: new Set(), msgs: [], sec: 'ident', mode: 'plain', total: 0, firstType: null, lastTypes: [],
      cnt: { open: 0, closed: 0, jargon: 0, repeat: 0, empathy: 0 },
      sk: { greet: false, empathy: false, more: false, summary: false, close: false },
      dead: false, active: false, sh: null, view: null
    };

    function reset(c) {
      S.c = c; S.ci = CASES.indexOf(c);
      S.asked = new Set(); S.msgs = []; S.sec = 'ident'; S.total = 0; S.firstType = null; S.lastTypes = [];
      S.cnt = { open: 0, closed: 0, jargon: 0, repeat: 0, empathy: 0 };
      S.sk = { greet: false, empathy: false, more: false, summary: false, close: false };
    }

    const secPct = sec => {
      const qs = qsFor(sec, S.c);
      const n = qs.filter(q => S.asked.has(q.id)).length;
      return { n, t: qs.length, p: qs.length ? Math.round(100 * n / qs.length) : 0 };
    };
    const rosGroupPct = g => {
      const qs = qsFor(SECS[6], S.c).filter(q => q.g === g);
      const n = qs.filter(q => S.asked.has(q.id)).length;
      return { n, t: qs.length, p: qs.length ? Math.round(100 * n / qs.length) : 0 };
    };
    const totalPct = () => {
      let n = 0, t = 0;
      SECS.forEach(s => { const r = secPct(s); n += r.n; t += r.t; });
      return Math.round(100 * n / t);
    };

    /* ------------------------------ chat */
    const timers = [];
    const later = (fn, ms) => { const t = setTimeout(() => { if (!S.dead) fn(); }, ms); timers.push(t); };
    const learn = () => S.sh && S.sh.mode === 'learn';

    function pushMsg(who, html, tag) { S.msgs.push({ who, html, tag }); }

    function redrawChat() {
      if (!S.active || !S.view) return;
      const box = S.view.querySelector('#hMsgs');
      if (!box) return;
      const c = S.c;
      box.innerHTML = S.msgs.map(m => {
        if (m.who === 'sys') return `<div class="his-b sys">${m.html}</div>`;
        if (m.who === 'dr') return `<div class="his-b dr"><small>Usted${m.tag && learn() ? ' · ' + m.tag : ''}</small>${m.html}</div>`;
        return `<div class="his-b pt"><small>${c.icon} Paciente</small>${m.html}</div>`;
      }).join('') || '<div class="his-b sys">Saluda y presenta al paciente, y empieza la entrevista con una pregunta abierta. Elige preguntas del banco de la izquierda.</div>';
      box.scrollTop = box.scrollHeight;
    }

    function patientSays(html, ms) {
      const idx = S.msgs.length;
      S.msgs.push({ who: 'pt', html: '<span style="color:var(--muted)">…</span>', typing: true });
      redrawChat();
      later(() => {
        S.msgs[idx] = { who: 'pt', html };
        redrawChat();
        redrawSide(); redrawTips();
      }, ms || 520);
    }

    function ask(q) {
      const c = S.c;
      const jarg = S.mode === 'tech' && JARG[q.id];
      const text = jarg || qText(q, c);
      pushMsg('dr', esc(text), q.t === 'o' ? 'abierta' : 'cerrada');
      if (jarg) {
        S.cnt.jargon++;
        patientSays(`Perdone, no le entiendo bien: ¿qué quiere decir exactamente? ¿Me lo puede explicar con otras palabras?`);
        redrawTips();
        return;
      }
      S.total++;
      if (S.firstType == null) S.firstType = q.t;
      S.lastTypes.push(q.t);
      let reply;
      if (S.asked.has(q.id)) {
        S.cnt.repeat++;
        reply = 'Eso ya se lo comenté, doctor: ' + ansFor(q, c).replace(/^./, m => m.toLowerCase());
      } else {
        S.asked.add(q.id);
        if (q.t === 'o') S.cnt.open++; else S.cnt.closed++;
        reply = ansFor(q, c);
        const sec = SECS.find(s => s.id === q.sec), r = secPct(sec);
        if (r.p === 100) S.sh.log(`Sección completa: <b>${esc(sec.name)}</b> (${r.t} preguntas).`, 'find');
      }
      patientSays(esc(reply));
      redrawSide(); redrawTips();
    }

    /* acciones de comunicación */
    const EMP = [
      'Entiendo que venir al médico puede generar cierta inquietud; estoy aquí para escucharle con calma.',
      'Gracias por contármelo; es normal preocuparse por la salud y me parece muy bien que se cuide.',
      'Comprendo lo que me dice. Si hay algo que le incomode, puede decírmelo con confianza.'
    ];
    const EMPR = [
      ['Gracias, la verdad estoy tranquila, pero se agradece.', 'Gracias; sí me preocupa un poco lo del corazón por mi papá.', 'Muy amable, gracias; me siento cómodo.'],
      ['Gracias, doctor, me da confianza.', 'Se lo agradezco; me tranquiliza que me lo diga.', 'Gracias, siempre es bueno que le escuchen a uno.'],
      ['Gracias, lo tendré en cuenta.', 'Gracias; si algo me inquieta se lo digo.', 'Se lo agradezco, de verdad.']
    ];
    const MOREA = ['No, creo que le conté todo. Solo me gustaría saber cómo cuidar mi espalda trabajando sentada.', 'Solo eso: que me confirme si mi corazón está bien.', 'No, nada más; muchas gracias.'];

    function act(id) {
      const c = S.c;
      if (id === 'greet') {
        S.sk.greet = true;
        pushMsg('dr', `Buenos días. Soy estudiante de medicina y voy a hacerle su historia clínica; todo lo que me cuente es confidencial. ¿Usted es ${esc(c.first)}?`, 'saludo');
        patientSays('Buenos días, sí, soy yo. Encantado de conocerle.'.replace('Encantado', c.sex === 'F' ? 'Encantada' : 'Encantado'));
      } else if (id === 'empathy') {
        const k = S.cnt.empathy % 3; S.cnt.empathy++; S.sk.empathy = true;
        pushMsg('dr', esc(EMP[k]), 'empatía');
        patientSays(esc(EMPR[k][S.ci]));
      } else if (id === 'more') {
        S.sk.more = true;
        pushMsg('dr', '¿Hay algo más que quiera contarme o preguntarme antes de terminar?', 'cierre abierto');
        patientSays(esc(MOREA[S.ci]));
      } else if (id === 'summary') {
        const done = SECS.filter(s => secPct(s).p >= 50), pend = SECS.filter(s => secPct(s).p < 50);
        pushMsg('dr', done.length
          ? `Si le he entendido bien, usted consulta por un control sin síntomas y hemos repasado: ${esc(done.map(s => s.short.toLowerCase()).join(', '))}. ¿Es correcto o quiere añadir algo?`
          : 'Si le he entendido bien, usted viene a un control. ¿Es correcto?', 'resumen');
        if (done.length >= 3) S.sk.summary = true;
        patientSays(done.length >= 3
          ? 'Sí, así es.' + (pend.length ? ` Aunque todavía no hemos hablado de ${esc(pend.map(s => s.short.toLowerCase()).join(', '))}.` : '')
          : 'Sí, aunque todavía hemos hablado de muy pocas cosas, doctor.');
      } else if (id === 'close') {
        S.sk.close = true;
        pushMsg('dr', 'Muchas gracias por su tiempo. Ahora pasaremos al examen físico y le iré explicando cada paso. ¿Tiene alguna duda?', 'cierre');
        patientSays('Ninguna, gracias. Adelante.');
        S.sh.log('Entrevista cerrada. Continúa con el examen físico y completa «Mis hallazgos».', 'find');
      }
      redrawTips();
    }

    function tips() {
      const t = [], cov = totalPct(), last = S.lastTypes.slice(-5);
      if (!S.sk.greet) t.push('Comienza saludando, presentándote y confirmando el nombre del paciente.');
      if (S.sk.greet && S.total === 0) t.push('Empieza con una pregunta abierta, por ejemplo «¿Qué le trae hoy por aquí?», y deja hablar sin interrumpir.');
      if (S.firstType === 'c') t.push('Empezaste con una pregunta cerrada. Es preferible abrir con una pregunta abierta y precisar después con cerradas (embudo: abiertas → cerradas).');
      if (S.lastTypes.length && S.lastTypes[S.lastTypes.length - 1] === 'o') t.push('Tras una pregunta abierta, escucha la respuesta completa y luego profundiza con preguntas cerradas.');
      if (last.length === 5 && last.every(x => x === 'c')) t.push('Llevas varias preguntas cerradas seguidas: intercala una abierta («¿Algo más sobre esto?») para no condicionar las respuestas.');
      if (S.cnt.jargon) t.push('Evita la jerga: di «falta de aire» en vez de «disnea», «sangre en la orina» en vez de «hematuria». Cambia a «Lenguaje claro».');
      if (S.cnt.repeat) t.push('Evita repetir preguntas ya respondidas; la lista marca lo que ya preguntaste.');
      if (S.total >= 10 && !S.sk.empathy) t.push('Muestra empatía: reconoce las emociones del paciente («Entiendo que...») al menos una vez.');
      if (cov >= 70 && !S.sk.summary) t.push('Haz un resumen de lo escuchado con las palabras del paciente y pídele que lo confirme.');
      if (cov >= 70 && !S.sk.more) t.push('Pregunta «¿Hay algo más que quiera contarme?» antes de cerrar.');
      if (S.sk.summary && S.sk.more && !S.sk.close) t.push('Cierra la entrevista agradeciendo y explicando el siguiente paso (examen físico).');
      if (!t.length) t.push(cov >= 70 ? 'Buen trabajo: mantén un lenguaje claro y completa las secciones pendientes.' : 'Sigue explorando las secciones: Filiación → Motivo → Enfermedad actual → Antecedentes → Revisión por sistemas.');
      return t.slice(0, 3);
    }

    function redrawTips() {
      if (!S.active || !S.view) return;
      const el = S.view.querySelector('#hTips');
      if (!el) return;
      el.style.display = learn() ? '' : 'none';
      el.innerHTML = '<b>Sugerencias de comunicación</b><ul>' + tips().map(x => `<li>${esc(x)}</li>`).join('') + '</ul>';
    }

    function redrawSide() {
      if (!S.active || !S.view) return;
      const secs = S.view.querySelector('#hSecs'), qs = S.view.querySelector('#hQs');
      if (!secs) return;
      const L = learn();
      secs.innerHTML = SECS.map(s => {
        const r = secPct(s);
        return `<button class="his-sec${s.id === S.sec ? ' on' : ''}" data-sec="${s.id}">${esc(s.short)}${L ? `<small>${r.p}%</small>` : ''}</button>`;
      }).join('');
      const sec = SECS.find(s => s.id === S.sec);
      let html = '', lastG = null;
      qsFor(sec, S.c).forEach(q => {
        if (q.g !== lastG) { lastG = q.g; if (q.g) html += `<div class="his-grp">${esc(q.g)}</div>`; }
        const done = L && S.asked.has(q.id);
        const text = (S.mode === 'tech' && JARG[q.id]) || qText(q, S.c);
        html += `<button class="his-q${done ? ' done' : ''}" data-q="${q.id}"><span class="tick">${done ? '✔' : ''}</span><span>${esc(text)}</span>${L ? `<span class="tag">${q.t === 'o' ? 'abierta' : 'cerrada'}</span>` : ''}</button>`;
      });
      qs.innerHTML = html;
    }

    const interview = {
      label: 'Entrevista',
      hint: 'Elige preguntas del banco (por secciones) y el paciente responderá. Alterna entre lenguaje claro y técnico para ver la diferencia.',
      tools: [
        { id: 'plain', icon: '🗣️', label: 'Lenguaje claro' },
        { id: 'tech', icon: '🩺', label: 'Lenguaje técnico' }
      ],
      enter(stage, sh) {
        S.sh = sh; S.active = true;
        const c = sh.case;
        stage.innerHTML = `<div class="his-wrap">
          <div class="his-side"><div class="his-secs" id="hSecs"></div><div id="hQs"></div></div>
          <div class="his-chat">
            <div class="his-head">${c.icon} Paciente virtual · ${c.age} años</div>
            <div class="his-msgs" id="hMsgs"></div>
            <div class="his-act" id="hAct">
              <button data-a="greet">👋 Saludar y presentarse</button>
              <button data-a="empathy">💬 Mostrar empatía</button>
              <button data-a="more">❔ «¿Algo más?»</button>
              <button data-a="summary">📝 Resumir</button>
              <button data-a="close">🤝 Cerrar la entrevista</button>
            </div>
            <div class="his-tips" id="hTips"></div>
          </div></div>`;
        S.view = stage.querySelector('.his-wrap');
        S.view.addEventListener('click', e => {
          const sb = e.target.closest('[data-sec]');
          if (sb) { S.sec = sb.dataset.sec; redrawSide(); return; }
          const qb = e.target.closest('[data-q]');
          if (qb) { ask(QBYID[qb.dataset.q]); return; }
          const ab = e.target.closest('[data-a]');
          if (ab) act(ab.dataset.a);
        });
        redrawSide(); redrawChat(); redrawTips();
      },
      leave() { S.active = false; S.view = null; },
      setTool(id) {
        S.mode = id;
        redrawSide();
        S.sh.hint(id === 'tech'
          ? 'Lenguaje técnico: el paciente no entiende la jerga y esas preguntas no se cuentan. Cambia a «Lenguaje claro».'
          : this.hint);
      },
      refresh() { redrawSide(); redrawTips(); redrawChat(); }
    };

    /* ------------------------------ cobertura */
    const cover = {
      label: 'Cobertura',
      hint: 'Resumen de las secciones exploradas y de las habilidades de comunicación.',
      tools: [],
      enter(stage, sh) {
        S.sh = sh; S.active = false;
        this.stage = stage; this.draw();
      },
      leave() {},
      refresh() { this.draw(); },
      draw() {
        const sh = S.sh, stage = this.stage;
        if (sh.mode !== 'learn') {
          stage.innerHTML = '<div class="his-pane"><h4>Modo Examen</h4><p>En el modo Examen no se muestra la cobertura mientras entrevistas. Pulsa «Comprobar mis respuestas» al terminar para ver el porcentaje por sección y tu comunicación.</p></div>';
          return;
        }
        const bar = (name, r) => `<div class="his-bar"><span>${esc(name)}</span><div class="tr"><div class="fl" style="width:${r.p}%"></div></div><b>${r.p}%</b></div>`;
        const SK = [['greet', 'Saludo y presentación'], ['openFirst', 'Primera pregunta abierta'], ['plain', 'Lenguaje claro (sin jerga sin explicar)'], ['empathy', 'Empatía'], ['more', '«¿Algo más?»'], ['summary', 'Resumen final'], ['close', 'Cierre y siguiente paso']];
        const st = { greet: S.sk.greet, openFirst: S.firstType === 'o', plain: S.cnt.jargon === 0 && S.total > 0, empathy: S.sk.empathy, more: S.sk.more, summary: S.sk.summary, close: S.sk.close };
        stage.innerHTML = `<div class="his-pane">
          <h4>Cobertura por sección · total ${totalPct()} %</h4>
          ${SECS.map(s => bar(s.name, secPct(s))).join('')}
          <h4>Revisión por sistemas</h4>
          ${ROSSYS.map(([k, n]) => bar(n, rosGroupPct(n))).join('')}
          <h4>Comunicación</h4>
          <ul class="his-chk">${SK.map(([k, n]) => `<li>${st[k] ? '<span class="m-ok">✔</span>' : '<span class="m-bad">○</span>'} ${esc(n)}</li>`).join('')}</ul>
          <p style="color:var(--muted);font-size:13px">Preguntas abiertas: <b>${S.cnt.open}</b> · cerradas: <b>${S.cnt.closed}</b> · repetidas: <b>${S.cnt.repeat}</b> · con jerga: <b>${S.cnt.jargon}</b>.</p>
        </div>`;
      }
    };

    /* ------------------------------ método clínico */
    const STEPS = ['Anamnesis (historia clínica)', 'Examen físico', 'Impresión diagnóstica', 'Estudios complementarios', 'Plan y seguimiento'];
    const TECH = [['insp', '👁️ Inspección'], ['palp', '✋ Palpación'], ['perc', '👆 Percusión'], ['asc', '🩺 Auscultación']];
    const method = {
      label: 'Método clínico',
      hint: 'Ordena las etapas del método clínico y las técnicas de exploración; pulsa «Comprobar orden».',
      tools: [],
      enter(stage, sh) {
        S.sh = sh; S.active = false;
        const st = { seqA: [], seqB: [], reg: 'gen' };
        const shuffled = (arr, seed) => arr.map((x, i) => [x, (i * 7 + seed) % arr.length]).sort((a, b) => a[1] - b[1]).map(x => x[0]);
        const stepOrder = shuffled(STEPS.map((s, i) => i), 3);
        const draw = () => {
          const L = sh.mode === 'learn';
          const tileA = stepOrder.map(i => `<button class="his-tile${st.seqA.includes(i) ? ' used' : ''}" data-a="${i}">${esc(STEPS[i])}</button>`).join('');
          const techOrder = TECH.slice().reverse();
          const tileB = techOrder.map(([k, n]) => `<button class="his-tile${st.seqB.includes(k) ? ' used' : ''}" data-b="${k}">${n}</button>`).join('');
          stage.innerHTML = `<div class="his-pane">
            <h4>1. Etapas del método clínico</h4>
            <div>${tileA}</div>
            <div class="his-seq" id="mA">${st.seqA.map((i, n) => `<span>${n + 1}. ${esc(STEPS[i])}</span>`).join('') || '<em style="color:var(--muted)">Pulsa las etapas en el orden correcto…</em>'}</div>
            <button class="btn small" id="chkA" style="width:auto">Comprobar orden</button> <button class="btn ghost small" id="rstA" style="width:auto">Reiniciar</button>
            <div id="fbA"></div>
            <h4>2. Orden de las técnicas de exploración física</h4>
            <div class="seg" id="regSeg"><button data-r="gen" class="${st.reg === 'gen' ? 'active' : ''}">Tórax, corazón, extremidades…</button><button data-r="abd" class="${st.reg === 'abd' ? 'active' : ''}">Abdomen</button></div>
            <div style="margin-top:6px">${tileB}</div>
            <div class="his-seq" id="mB">${st.seqB.map((k, n) => `<span>${n + 1}. ${esc(TECH.find(t => t[0] === k)[1])}</span>`).join('') || '<em style="color:var(--muted)">Ordena las técnicas…</em>'}</div>
            <button class="btn small" id="chkB" style="width:auto">Comprobar orden</button> <button class="btn ghost small" id="rstB" style="width:auto">Reiniciar</button>
            <div id="fbB"></div>
            ${L ? `<h4>Estructura de la historia clínica</h4>
            <ol style="margin:0;padding-left:20px;font-size:13.5px">
              <li>Identificación / filiación</li><li>Motivo de consulta (con las palabras del paciente)</li><li>Historia de la enfermedad actual (SOCRATES / OPQRST)</li>
              <li>Antecedentes personales (patológicos, quirúrgicos, alérgicos, medicación, hábitos, ginecoobstétricos, vacunas)</li><li>Antecedentes familiares</li>
              <li>Historia psicosocial, laboral y vivienda</li><li>Revisión por aparatos y sistemas</li><li>Examen físico → impresión diagnóstica → plan</li></ol>` : ''}
          </div>`;
        };
        stage.addEventListener('click', this._h = e => {
          const a = e.target.closest('[data-a]'), b = e.target.closest('[data-b]'), r = e.target.closest('[data-r]');
          const fbA = () => stage.querySelector('#fbA'), fbB = () => stage.querySelector('#fbB');
          if (a && a.dataset.a !== undefined && a.classList.contains('his-tile')) { st.seqA.push(+a.dataset.a); draw(); return; }
          if (b) { st.seqB.push(b.dataset.b); draw(); return; }
          if (r) { st.reg = r.dataset.r; st.seqB = []; draw(); return; }
          const L = sh.mode === 'learn';
          if (e.target.id === 'rstA') { st.seqA = []; draw(); }
          else if (e.target.id === 'rstB') { st.seqB = []; draw(); }
          else if (e.target.id === 'chkA') {
            const ok = st.seqA.length === 5 && st.seqA.every((v, i) => v === i);
            fbA().innerHTML = `<div class="his-fb ${ok ? 'ok' : 'bad'}">${ok ? '✔ Correcto.' : '✘ Orden incorrecto o incompleto.'}${L ? ' Anamnesis → examen físico → impresión diagnóstica → estudios complementarios → plan. La anamnesis orienta qué explorar y qué pedir.' : ''}</div>`;
          } else if (e.target.id === 'chkB') {
            const want = st.reg === 'abd' ? ['insp', 'asc', 'perc', 'palp'] : ['insp', 'palp', 'perc', 'asc'];
            const ok = st.seqB.length === 4 && st.seqB.every((v, i) => v === want[i]);
            fbB().innerHTML = `<div class="his-fb ${ok ? 'ok' : 'bad'}">${ok ? '✔ Correcto.' : '✘ Orden incorrecto o incompleto.'}${L ? (st.reg === 'abd'
              ? ' En el abdomen: inspección, auscultación, percusión, palpación. La percusión y la palpación pueden modificar la actividad intestinal y alterar los ruidos hidroaéreos.'
              : ' Orden general: inspección, palpación, percusión, auscultación.') : ''}</div>`;
            if (ok) sh.log(`Orden de exploración correcto (${st.reg === 'abd' ? 'abdomen: IAPP' : 'general: IPPA'}).`, 'find');
          }
        });
        this._st = stage;
        draw();
      },
      leave() { if (this._st && this._h) this._st.removeEventListener('click', this._h); },
      refresh() { /* se redibuja al volver a entrar */ const stg = this._st; if (stg) { this.leave(); this.enter(stg, S.sh); } }
    };

    /* ------------------------------ registro y evaluación */
    const sel = (f, opts) => `<select data-f="${f}"><option value="">–</option>${opts.map(([v, t]) => `<option value="${v}">${esc(t)}</option>`).join('')}</select>`;
    const QUIZ = [
      { q: '¿Cuál es el orden correcto del método clínico?', options: ['Examen físico → anamnesis → impresión diagnóstica', 'Anamnesis → examen físico → impresión diagnóstica', 'Impresión diagnóstica → anamnesis → examen físico', 'Estudios de laboratorio → anamnesis → examen físico'], a: 1, why: 'La anamnesis orienta el examen físico y ambos sustentan la impresión diagnóstica; después se piden estudios y se plantea el plan.' },
      { q: 'Orden habitual de las técnicas de exploración en tórax, corazón o extremidades', options: ['Inspección, palpación, percusión, auscultación', 'Inspección, auscultación, percusión, palpación', 'Palpación, inspección, auscultación, percusión', 'Auscultación, inspección, palpación, percusión'], a: 0, why: 'Se observa primero, luego se palpa, se percute y se ausculta (IPPA).' },
      { q: 'En el abdomen el orden de las técnicas es', options: ['Auscultación, inspección, percusión, palpación', 'Inspección, palpación, percusión, auscultación', 'Inspección, auscultación, percusión, palpación', 'Palpación, percusión, auscultación, inspección'], a: 2, why: 'IAPP: la percusión y la palpación pueden alterar los ruidos hidroaéreos, por eso se ausculta antes.' },
      { q: '¿Cuál es una pregunta abierta?', options: ['¿Tiene fiebre?', '¿Le duele el pecho al caminar?', '¿Fuma?', '¿Qué le trae hoy por aquí?'], a: 3, why: 'Las preguntas abiertas no se contestan con sí/no y dejan que el paciente cuente su historia; se usan al inicio, y las cerradas después para precisar.' },
      { q: 'En SOCRATES, la letra «A» explora', options: ['Síntomas asociados', 'Antecedentes familiares', 'Alergias', 'Aparatos y sistemas'], a: 0, why: 'SOCRATES: Sitio, Onset (inicio), Carácter, Radiación, Asociados, Tiempo, Exacerbantes/atenuantes, Severidad.' },
      { q: 'Un paciente fumó 5 cigarrillos al día durante 10 años. ¿Cuántos paquetes-año son?', options: ['0,5', '1', '2,5', '5'], a: 2, why: 'Paquetes-año = cigarrillos/día ÷ 20 × años: 5 ÷ 20 × 10 = 2,5.' },
      { q: 'Cuando el paciente expresa una preocupación, lo más adecuado es', options: ['Cambiar de tema para ahorrar tiempo', 'Tranquilizarlo de inmediato sin escucharlo', 'Reconocer su emoción y explorarla (empatía)', 'Usar términos técnicos para dar seguridad'], a: 2, why: 'Reconocer la emoción («Entiendo que le preocupe...») fortalece la relación y mejora la información obtenida.' }
    ];

    function recordHTML(c) {
      reset(c);
      return `<div class="his-rec">
        <h5>Identificación</h5>
        <label class="field">Nombre completo</label><input class="his-in" type="text" data-f="nombre" autocomplete="off">
        <label class="field">Estado civil</label>${sel('civil', OPT.civil)}
        <label class="field">Ocupación</label><input class="his-in" type="text" data-f="ocup" autocomplete="off">
        <label class="field">Convive con</label>${sel('convive', OPT.convive)}
        <h5>Motivo de consulta</h5>${sel('motivo', OPT.motivo)}
        <h5>Antecedentes personales</h5>
        <label class="field">Enfermedades previas</label>${sel('enf', OPT.enf)}
        <label class="field">Cirugías</label>${sel('cir', OPT.cir)}
        <label class="field">Alergias</label>${sel('ale', OPT.ale)}
        <label class="field">Medicación habitual</label>${sel('med', OPT.med)}
        <label class="field">Tabaco</label>${sel('tab', OPT.tab)}
        <label class="field">Alcohol</label>${sel('alc', OPT.alc)}
        <label class="field">Actividad física</label>${sel('eje', OPT.eje)}
        <h5>Antecedentes familiares (marca los presentes)</h5>
        <div class="his-chkgrid">${FAM.map(([k, n]) => `<label><input type="checkbox" data-fam="${k}"> ${esc(n)}</label>`).join('')}</div>
        <h5>Revisión por sistemas (marca los que refieren síntomas)</h5>
        <div class="his-chkgrid">${ROSSYS.map(([k, n]) => `<label><input type="checkbox" data-ros="${k}"> ${esc(n)}</label>`).join('')}</div>
        <h5>Cuestionario del método clínico</h5>
        ${QUIZ.map((q, i) => `<label class="field">${i + 1}. ${esc(q.q)}</label>
          <select data-q="${i}"><option value="">–</option>${q.options.map((o, j) => `<option value="${j}">${esc(o)}</option>`).join('')}</select>`).join('')}
      </div>`;
    }

    // preguntas que justifican cada campo
    const NEEDS = {
      nombre: ['nom'], civil: ['civil'], ocup: ['ocup', 'ps2'], convive: ['res', 'ps1'], motivo: ['mot1', 'mot3'],
      enf: ['ap1', 'ap2'], cir: ['ap5', 'ap3'], ale: ['ap7', 'ap8'], med: ['ap9'], tab: ['ap11'], alc: ['ap12'], eje: ['ap14'],
      fam: ['af1', 'af2', 'af4'], ros: ['g1', 'c1', 'r1', 'd1', 'u1', 'n1', 'm1', 'p1', 'e1', 'y1']
    };
    const matchKw = (txt, groups) => { const n = norm(txt); return groups.every(g => g.some(k => n.includes(k))); };
    const label = (k, v) => { const o = (OPT[k] || []).find(x => x[0] === v); return o ? o[1] : v; };

    function evaluate(c, rec) {
      const f = c.ficha;
      const val = k => (rec.querySelector(`[data-f="${k}"]`) || { value: '' }).value;
      const asked = k => NEEDS[k].some(id => S.asked.has(id));
      let ok = 0, tot = 0;
      const row = (name, mine, real, good, k) => {
        tot++; if (good) ok++;
        const warn = good && !asked(k) ? ' <span class="m-near" title="No lo preguntaste en la entrevista">⚠ no preguntado</span>' : '';
        return `<tr><td>${esc(name)}</td><td>${mine === '' ? '–' : esc(mine)}</td><td>${esc(real)}</td><td>${good ? '<span class="m-ok">✔</span>' : '<span class="m-bad">✘</span>'}${warn}</td></tr>`;
      };
      const selRow = (name, k) => { const m = val(k); return row(name, m ? label(k, m) : '', label(k, f[k]), m === f[k], k); };
      const nm = val('nombre'), oc = val('ocup');
      let rows = row('Nombre', nm, f.nombre, nm !== '' && matchKw(nm, f.nombreKw), 'nombre') +
        selRow('Estado civil', 'civil') +
        row('Ocupación', oc, f.ocup, oc !== '' && matchKw(oc, f.ocupKw), 'ocup') +
        selRow('Convive con', 'convive') + selRow('Motivo', 'motivo') + selRow('Enfermedades', 'enf') + selRow('Cirugías', 'cir') +
        selRow('Alergias', 'ale') + selRow('Medicación', 'med') + selRow('Tabaco', 'tab') + selRow('Alcohol', 'alc') + selRow('Actividad física', 'eje');
      const fam = FAM.filter(([k]) => rec.querySelector(`[data-fam="${k}"]`).checked).map(x => x[0]);
      const famReal = f.fam.slice();
      const famOk = fam.length === famReal.length && fam.every(k => famReal.includes(k));
      const fnames = a => a.map(k => FAM.find(x => x[0] === k)[1]).join(', ') || 'ninguno';
      rows += row('Ant. familiares', fnames(fam), fnames(famReal), famOk, 'fam');
      const ros = ROSSYS.filter(([k]) => rec.querySelector(`[data-ros="${k}"]`).checked).map(x => ROSNAME[x[0]]);
      rows += row('Sistemas con síntomas', ros.join(', ') || 'ninguno', 'ninguno (revisión negativa)', ros.length === 0, 'ros');

      let qok = 0;
      const qrows = QUIZ.map((q, i) => {
        const v = rec.querySelector(`select[data-q="${i}"]`).value, good = v !== '' && +v === q.a;
        if (good) qok++;
        return `<li>${good ? '<span class="m-ok">✔</span>' : '<span class="m-bad">✘</span>'} <b>${esc(q.options[q.a])}</b>. ${esc(q.why)}</li>`;
      }).join('');

      const secList = SECS.map(s => { const r = secPct(s); return `<li>${esc(s.short)}: <b>${r.p} %</b> (${r.n}/${r.t})</li>`; }).join('');
      const com = [
        [S.sk.greet, 'Saludo y presentación'], [S.firstType === 'o', 'Primera pregunta abierta'], [S.total > 0 && S.cnt.jargon === 0, 'Lenguaje claro'],
        [S.sk.empathy, 'Empatía'], [S.sk.more, '«¿Algo más?»'], [S.sk.summary, 'Resumen final'], [S.sk.close, 'Cierre']
      ];
      const pend = SECS.filter(s => secPct(s).p < 100).map(s => s.short);
      return `<h4>Comparación con la ficha del paciente</h4>
        <table class="res"><tr><th>Campo</th><th>Tu registro</th><th>Real</th><th></th></tr>${rows}</table>
        <p><b>${ok}</b> de ${tot} campos coinciden.</p>
        <h4>Cuestionario</h4><p><b>${qok}</b> de ${QUIZ.length} correctas.</p><ul>${qrows}</ul>
        <h4>Cobertura de la entrevista · ${totalPct()} %</h4><ul>${secList}</ul>
        ${pend.length ? `<p style="font-size:12.5px;color:var(--muted)">Secciones incompletas: ${esc(pend.join(', '))}.</p>` : ''}
        <h4>Comunicación</h4><ul>${com.map(([g, n]) => `<li>${g ? '<span class="m-ok">✔</span>' : '<span class="m-bad">✘</span>'} ${esc(n)}</li>`).join('')}</ul>
        <p style="font-size:12.5px;color:var(--muted)">Preguntas abiertas: ${S.cnt.open} · cerradas: ${S.cnt.closed} · repetidas: ${S.cnt.repeat} · con jerga: ${S.cnt.jargon}.</p>`;
    }

    const sh = new Shell(root, {
      cases: CASES,
      scenes: { interview, cover, method },
      order: ['interview', 'cover', 'method'],
      hideDx: true,
      checkLabel: 'Comprobar mis respuestas', recordTitle: 'Mis hallazgos · historia clínica', patientTitle: 'Paciente virtual',
      caseLabel: (c, i) => `Paciente ${i + 1} · ${c.age} años, ${c.sex}`,
      record: recordHTML, evaluate,
      teaching: [
        'Abre con preguntas abiertas («¿Qué le trae hoy por aquí?») y deja hablar sin interrumpir; después precisa con preguntas cerradas (embudo de la entrevista).',
        'SOCRATES (Sitio, Onset, Carácter, Radiación, Asociados, Tiempo, Exacerbantes/atenuantes, Severidad) y OPQRST ordenan la caracterización de un síntoma; en una persona sana confirman que no hay síntoma.',
        'En los antecedentes cuantifica: paquetes-año (cigarrillos/día ÷ 20 × años), unidades de alcohol, tipo y fecha de cirugías, reacción de cada alergia y dosis de cada fármaco.',
        'Usa lenguaje claro, muestra empatía, resume con las palabras del paciente y pregunta «¿hay algo más?» antes de cerrar.',
        'Método clínico: anamnesis → examen físico → impresión diagnóstica. Exploración: inspección, palpación, percusión, auscultación; en el abdomen, inspección, auscultación, percusión, palpación.'
      ]
    });
    const origDestroy = sh.destroy.bind(sh);
    sh.destroy = function () { S.dead = true; timers.forEach(clearTimeout); origDestroy(); };
    S.sh = sh;
    sh.start();
    return sh;
  }

  registerModule({
    id: 'history', title: 'Anamnesis e historia clínica', icon: '📋', group: 'Exploración normal',
    desc: 'Entrevista a un paciente virtual sano y construcción de la historia clínica según el método clínico.',
    bullets: ['Banco de preguntas por secciones con cobertura en vivo', 'SOCRATES/OPQRST, antecedentes y revisión por sistemas', 'Comunicación: preguntas abiertas, empatía, resumen', 'Método clínico y orden de la exploración (IPPA / IAPP)'],
    mount: root => mount(root)
  });
})();
