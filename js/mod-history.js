/* Módulo "Anamnesis e historia clínica": entrevista a un paciente virtual sano,
   cobertura por secciones, comunicación y método clínico. Shell propio (id: history). */
(function () {
  'use strict';
  const { esc } = U;

  const norm = s => String(s == null ? '' : s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  /* ------------------------------------------------------------------ CASOS
     Cuatro pacientes virtuales sanos, alineados con NormalEngine.people (28 F, 45 M, 72 M, 60 F posmenopáusica).
     Las respuestas del banco se indexan por posición en CASES o por id (objeto {h1:…, h4:…, '*': por defecto}). */
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
    },
    {
      id: 'h4', age: 60, sex: 'F', first: 'Teresa', icon: '👩‍🦳', diag: 'Entrevista normal',
      complaint: 'Consulta externa. Entrevista a la paciente (posmenopáusica) y completa su historia clínica.',
      vitals: 'Talla 1,60 m · Peso 61 kg · IMC 23,8',
      ficha: {
        nombre: 'Teresa Núñez Arce', nombreKw: [['teresa'], ['nunez', 'arce']],
        civil: 'div', ocup: 'Contadora', ocupKw: [['contad', 'contab']], convive: 'hijos', motivo: 'chequeo',
        enf: 'ninguna', cir: 'cesarea', ale: 'ninguna', med: 'ninguna', tab: 'ex', alc: 'oca', eje: 'oca',
        fam: ['hta', 'ca'], ros: []
      }
    }
  ];

  const OPT = {
    civil: [['soltero', 'Soltero/a'], ['casado', 'Casado/a'], ['union', 'Unión libre'], ['viudo', 'Viudo/a'], ['div', 'Divorciado/a']],
    convive: [['solo', 'Solo/a'], ['pareja', 'Con su pareja'], ['familia', 'Con pareja e hijos'], ['hijos', 'Con hijos/as (sin pareja)'], ['amigos', 'Con amigos o compañeros'], ['origen', 'Con su familia de origen']],
    motivo: [['chequeo', 'Control o chequeo sin síntomas'], ['dolor', 'Dolor'], ['fiebre', 'Fiebre'], ['resp', 'Tos o dificultad para respirar'], ['otro', 'Otro síntoma']],
    enf: [['ninguna', 'Ninguna'], ['hta', 'Hipertensión arterial'], ['dm', 'Diabetes'], ['asma', 'Asma'], ['dislip', 'Dislipidemia (colesterol alto)'], ['otra', 'Otra']],
    cir: [['ninguna', 'Ninguna'], ['apendice', 'Apendicectomía'], ['hernia', 'Hernioplastia inguinal'], ['cesarea', 'Cesárea'], ['otra', 'Otra']],
    ale: [['ninguna', 'Ninguna conocida'], ['med', 'A medicamentos'], ['alim', 'A alimentos'], ['otra', 'Otra']],
    med: [['ninguna', 'Ninguna'], ['acho', 'Anticonceptivo oral'], ['antihta', 'Antihipertensivo'], ['hipolip', 'Hipolipemiante'], ['otra', 'Otra']],
    tab: [['nunca', 'Nunca ha fumado'], ['ex', 'Exfumador/a'], ['act', 'Fumador/a actual']],
    alc: [['nunca', 'Nunca'], ['oca', 'Ocasional (social)'], ['mod', 'Diario moderado (1 copa)'], ['exc', 'Excesivo']],
    eje: [['sed', 'Sedentario/a'], ['oca', 'Ocasional (1-2 veces/sem)'], ['reg', 'Regular (3 o más veces/sem)']]
  };
  const FAM = [['hta', 'HTA'], ['dm', 'Diabetes'], ['cardio', 'Cardiopatía isquémica'], ['ca', 'Cáncer'], ['acv', 'ACV'], ['tiro', 'Enf. tiroidea']];
  const ROSSYS = [['gen', 'General'], ['cv', 'Cardiovascular'], ['resp', 'Respiratorio'], ['dig', 'Digestivo'], ['gu', 'Genitourinario'],
    ['neu', 'Neurológico'], ['msk', 'Osteoarticular y muscular'], ['piel', 'Piel'], ['end', 'Endocrino'], ['psi', 'Psíquico']];
  const ROSNAME = {};
  ROSSYS.forEach(([k, n]) => { ROSNAME[k] = n; });

  /* ------------------------------------------------------------ BANCO DE PREGUNTAS
     Q(id, grupo, texto, tipo 'o' abierta | 'c' cerrada, respuesta, extra {sex})
     respuesta: texto (igual para todos) | [h1, h2, h3, h4] por posición en CASES | {h1:…, '*': por defecto} por id. */
  const Q = (id, g, text, t, ans, x) => Object.assign({ id, g, text, t, ans }, x || {});

  const SECS = [
    {
      id: 'ident', name: 'Datos de filiación', short: 'Filiación', qs: [
        Q('nom', '', '¿Cómo se llama? ¿Me dice su nombre completo?', 'c', ['Me llamo Ana Lucía Reyes Morales.', 'Roberto Salazar Pineda, para servirle.', 'Manuel Ortega Vidal.', 'Teresa Núñez Arce.']),
        Q('edad', '', '¿Qué edad tiene y cuál es su fecha de nacimiento?', 'c', ['Tengo 28 años; nací el 14 de marzo de 1998.', 'Tengo 45 años; nací el 3 de julio de 1981.', 'Tengo 72 años; nací el 11 de enero de 1954.', 'Tengo 60 años; nací el 22 de mayo de 1966.']),
        Q('civil', '', '¿Cuál es su estado civil?', 'c', ['Soltera, aunque tengo pareja estable desde hace tres años.', 'Casado desde hace 16 años.', 'Casado; llevo 47 años con mi esposa Carmen.', 'Divorciada desde hace 12 años.']),
        Q('ocup', '', '¿A qué se dedica? ¿Cuál es su ocupación?', 'o', ['Soy diseñadora gráfica; trabajo por mi cuenta, casi siempre desde casa y a veces en el estudio de algún cliente.', 'Soy ingeniero civil; superviso obras y también paso tiempo en la oficina con planos y presupuestos.', 'Fui maestro de primaria durante 38 años; llevo siete años jubilado.', 'Soy contadora; trabajo en la oficina de una empresa de transporte, ocho horas al día.']),
        Q('res', '', '¿Dónde vive y con quién vive?', 'o', ['Vivo en un departamento en la ciudad, que comparto con una amiga.', 'Vivo en una casa en un barrio urbano con mi esposa y mis dos hijos, de 12 y 9 años.', 'Vivo con mi esposa en nuestra casa de dos plantas; nuestros hijos viven cerca.', 'Vivo en una casa en la ciudad con mi hija, de 30 años, y mi nieto de 4.']),
        Q('esc', '', '¿Hasta qué nivel estudió?', 'c', ['Terminé la carrera de diseño en la universidad.', 'Soy ingeniero titulado y tengo una maestría.', 'Hice la escuela normal de magisterio, estudios superiores.', 'Terminé la universidad: soy contadora pública.']),
        Q('acomp', '', '¿Ha venido acompañado/a hoy?', 'c', ['No, vine sola.', 'No, vine solo, directo desde el trabajo.', 'Me acompañó mi esposa, pero prefirió esperar afuera.', 'No, vine sola.'])
      ]
    },
    {
      id: 'motivo', name: 'Motivo de consulta', short: 'Motivo', qs: [
        Q('mot1', '', '¿Qué le trae hoy por aquí? ¿Cuál es el motivo de su consulta?', 'o', ['Vengo a mi chequeo anual. No tengo ninguna molestia; solo quiero que me revisen.', 'Vengo a mi chequeo médico anual que pide la empresa y, la verdad, también quería revisarme el corazón por mi papá.', 'Vengo a mi control de rutina, como todos los años. Me siento bien.', 'Vengo a mi control anual. Me siento bien; aprovecho para preguntar qué controles me corresponden después de la menopausia.']),
        Q('mot2', '', '¿Hay algo que le preocupe de su salud?', 'o', ['Nada en particular; quiero asegurarme de que todo está bien y preguntar por mi alimentación.', 'Un poco el corazón: mi papá tuvo un infarto y me da cierta inquietud.', 'Nada especial; quiero seguir activo y cuidar el colesterol.', 'Un poco los huesos, por la menopausia, y las mamas, porque mi madre tuvo cáncer de mama; por eso me hago la mamografía.']),
        Q('mot3', '', '¿Tiene alguna molestia o síntoma en este momento?', 'c', 'No, ninguno. Me siento bien.'),
        Q('mot4', '', '¿Cuándo fue su último chequeo médico?', 'c', ['Hace un año; todo salió normal.', 'Hace un año y medio, también por el trabajo.', 'Hace unos ocho meses; voy una vez al año.', 'Hace un año; todo salió bien.']),
        Q('mot5', '', '¿Qué espera de esta consulta?', 'o', ['Que me confirmen que estoy sana y que me orienten para mantenerme bien.', 'Saber si tengo algún riesgo del corazón y cómo reducirlo.', 'Que me digan que todo sigue en orden y qué más puedo hacer para cuidarme.', 'Que me revisen y me digan qué estudios de control me corresponden a mi edad.'])
      ]
    },
    {
      id: 'hea', name: 'Enfermedad actual', short: 'Enf. actual', qs: [
        Q('s', 'Localización', 'Si tuviera alguna molestia, ¿en qué parte del cuerpo la siente?', 'o', 'En ninguna parte; no tengo ninguna molestia. Vengo solo por el control.'),
        Q('o', 'Forma de inicio', '¿Cuándo empezó la molestia y cómo, de golpe o poco a poco?', 'o', 'No hay nada que haya empezado; me siento igual que siempre.'),
        Q('c', 'Carácter o tipo', '¿Cómo es la molestia: punzante, opresiva, ardor, cólico?', 'c', 'No tengo ninguna molestia que describir.'),
        Q('r', 'Irradiación', '¿Se corre o se extiende hacia algún otro sitio?', 'c', 'No, no tengo ningún dolor que se corra a otro lado.'),
        Q('a', 'Síntomas acompañantes', '¿Se acompaña de fiebre, náuseas, falta de aire o sudores?', 'c', 'No, no he tenido fiebre, náuseas, falta de aire ni sudores.'),
        Q('t', 'Evolución en el tiempo', '¿Es constante o va y viene? ¿Cuánto dura cada episodio?', 'o', 'No tengo ningún síntoma, ni constante ni intermitente.'),
        Q('e', 'Factores que la modifican', '¿Qué la mejora y qué la empeora?', 'o', 'No hay nada que me mejore ni me empeore, porque no tengo molestias.'),
        Q('sev', 'Intensidad', 'Del 0 al 10, ¿qué intensidad tiene la molestia?', 'c', 'Del 0 al 10, un 0: no tengo dolor.'),
        Q('cambio', 'Cambios recientes', '¿Ha notado algún cambio reciente en su salud, su peso o su energía?', 'c', ['No, mi peso y mi energía están estables.', 'No he notado cambios; me siento como siempre.', 'No, nada distinto; sigo con mis actividades de siempre.', 'No, mi peso y mi energía están igual que siempre.']),
        Q('trat', 'Cambios recientes', '¿Ha tomado algún medicamento o remedio para algo en los últimos días?', 'c', ['Solo mi anticonceptivo de siempre; nada para ninguna molestia.', 'Nada, ni pastillas ni remedios.', 'Nada, ni siquiera un paracetamol en estos días.', 'Nada en los últimos días.']),
        Q('falta', 'Cambios recientes', '¿Ha tenido que faltar al trabajo o dejar actividades por algún problema de salud?', 'c', ['No, no he faltado al trabajo por enfermedad.', 'No, ni un día este año.', 'No, hace años que no dejo mis actividades por salud.', 'No, no he faltado al trabajo por salud.'])
      ]
    },
    {
      id: 'ap', name: 'Antecedentes personales', short: 'Ant. personales', qs: [
        Q('ap1', 'Patológicos', '¿Tiene alguna enfermedad diagnosticada (presión alta, diabetes, asma, colesterol alto...)?', 'c', ['No, ninguna enfermedad diagnosticada; mi presión y mi azúcar han salido normales.', 'No tengo ninguna enfermedad diagnosticada; mi presión ha salido normal en los chequeos.', 'Solo el colesterol algo alto, que controlo con dieta y ejercicio. De presión y de azúcar estoy bien.', 'No, ninguna; la presión y el azúcar me han salido normales en los controles.']),
        Q('ap2', 'Patológicos', '¿Qué enfermedades importantes ha tenido a lo largo de su vida?', 'o', ['De niña, varicela y alguna amigdalitis; nada importante después.', 'De niño tuve varicela y sarampión; de adulto, resfriados fuertes, nada más.', 'Las de la infancia, y hace unos 30 años una neumonía que se curó bien. Fuera de eso, el colesterol.', 'Las de la infancia (varicela, paperas) y nada importante después.']),
        Q('ap3', 'Patológicos', '¿Ha estado hospitalizado/a alguna vez?', 'c', ['No, nunca me han internado.', 'Solo cuando me operaron del apéndice, a los 19 años.', 'Dos días cuando me operaron de la hernia, hace unos veinte años.', 'Solo por los partos: un día con el primero y tres días con el segundo, que fue por cesárea.']),
        Q('ap4', 'Patológicos', '¿Ha recibido alguna transfusión de sangre?', 'c', 'No, nunca he recibido transfusiones.'),
        Q('ap5', 'Quirúrgicos y traumáticos', '¿Le han operado alguna vez?', 'c', ['No, nunca me han operado.', 'Sí, de apendicitis a los 19 años; sin complicaciones.', 'Sí, de una hernia inguinal del lado derecho a los 52 años; salió todo bien.', 'Sí, una cesárea a los 30 años, en el segundo embarazo; sin complicaciones.']),
        Q('ap6', 'Quirúrgicos y traumáticos', '¿Ha tenido fracturas, accidentes o golpes importantes?', 'c', ['No, nunca me he roto un hueso.', 'Me fracturé la muñeca izquierda jugando fútbol a los 16 años; sanó bien.', 'Ninguna fractura; algún esguince de tobillo hace años.', 'No, ninguna fractura ni accidente.']),
        Q('ap7', 'Alérgicos', '¿Es alérgico/a a algún medicamento?', 'c', ['No, que yo sepa no soy alérgica a ningún medicamento.', 'Sí, a la penicilina: de niño me salió urticaria (ronchas) con una inyección. Desde entonces no me la dan.', 'No, nunca he tenido reacciones a medicamentos.', 'No, ninguna alergia a medicamentos.']),
        Q('ap8', 'Alérgicos', '¿Tiene alergia a alimentos, polen, látex o picaduras?', 'c', 'No, a nada más.'),
        Q('ap9', 'Medicación', '¿Toma algún medicamento de forma habitual?', 'c', ['Solo el anticonceptivo oral, una pastilla al día, desde hace tres años.', 'No tomo ningún medicamento de forma regular.', 'Ninguno de forma regular; un paracetamol si me duele la cabeza una vez al año, más o menos.', 'No tomo ningún medicamento de forma habitual; tampoco tratamiento hormonal.']),
        Q('ap10', 'Medicación', '¿Usa vitaminas, suplementos, productos naturales o se automedica?', 'c', ['A veces un multivitamínico; nada más.', 'No, nada de eso.', 'Vitamina D en invierno, por recomendación de mi médico.', 'No; mi ginecóloga me dijo que por ahora con la alimentación y el ejercicio es suficiente.']),
        Q('ap11', 'Hábitos', '¿Fuma o ha fumado alguna vez? ¿Cuántos cigarrillos al día y durante cuántos años?', 'c', ['No, nunca he fumado.', 'Fumé unos 5 cigarrillos al día, de los 20 a los 30 años. Lo dejé hace 15 años y no he vuelto a fumar.', 'No, nunca he fumado.', 'Fumé unos 10 cigarrillos al día de los 20 a los 40 años; lo dejé hace 20 años y no he vuelto a fumar.']),
        Q('ap12', 'Hábitos', '¿Con qué frecuencia toma bebidas alcohólicas y cuánto?', 'c', ['Una o dos copas de vino algún fin de semana, en reuniones.', 'Dos o tres cervezas los fines de semana, con amigos.', 'Una copa de vino con la comida, a diario.', 'Una copa de vino en alguna reunión, una o dos veces al mes.']),
        Q('ap13', 'Hábitos', '¿Consume alguna droga o sustancia recreativa?', 'c', 'No, nunca he consumido drogas.'),
        Q('ap14', 'Hábitos', '¿Hace ejercicio? ¿Qué tipo y con qué frecuencia?', 'o', ['Hago yoga tres veces por semana, una hora, y salgo a caminar casi todos los días.', 'Juego fútbol los domingos y camino 30 minutos un par de veces por semana; sé que debería hacer más.', 'Camino 40 minutos todas las mañanas y cuido el huerto; subo escaleras sin problema.', 'Camino unos 30 minutos dos veces por semana; sé que debería moverme más.']),
        Q('ap15', 'Hábitos', '¿Cómo es su alimentación en un día normal?', 'o', ['Como de todo: muchas verduras y fruta, legumbres, pollo y pescado; poca carne roja y pocos dulces.', 'Desayuno café con pan, almuerzo casi siempre fuera, a veces fritos, y ceno en casa. Me paso un poco con la sal y los refrescos.', 'Dieta mediterránea: verduras, pescado, legumbres y aceite de oliva; poca sal y pocos embutidos.', 'Desayuno café con tostadas, almuerzo algo liviano en el trabajo y ceno en casa verduras con pollo o pescado; tomo lácteos todos los días.']),
        Q('ap16', 'Hábitos', '¿Cómo duerme? ¿Cuántas horas y descansa bien?', 'o', ['Duermo 7 u 8 horas y descanso bien.', 'Duermo unas 6 o 7 horas; entre semana madrugo mucho, pero me levanto descansado.', 'Me acuesto a las 11 y me levanto a las 6:30; duermo de un tirón y descanso bien.', 'Duermo unas 7 horas; a veces me despierto de madrugada, pero me vuelvo a dormir y me levanto descansada.']),
        Q('ap17', 'Hábitos', '¿Cuántos cafés o bebidas con cafeína toma al día?', 'c', ['Uno o dos cafés al día.', 'Tres cafés al día, sobre todo por la mañana.', 'Un café con leche en el desayuno, nada más.', 'Dos cafés al día.']),
        Q('go1', 'Fisiológicos: ginecoobstétricos', '¿A qué edad tuvo su primera menstruación (menarca)?', 'c', { h1: 'A los 12 años.', h4: 'A los 13 años.', '*': 'A los 12 años.' }, { sex: 'F' }),
        Q('go2', 'Fisiológicos: ginecoobstétricos', '¿Cómo son sus ciclos menstruales (duración, regularidad, cantidad, dolor)?', 'o', { h1: 'Con la pastilla tengo el sangrado regular, cada 28 días; dura 4 o 5 días, es moderado y sin dolor importante.', h4: 'Ya no menstrúo: la menopausia fue a los 51 años. Antes mis ciclos eran regulares, cada 28 o 30 días, de 4 días y sin dolor.', '*': 'Ciclos regulares, cada 28 días, de 4 o 5 días, sin dolor importante.' }, { sex: 'F' }),
        Q('go3', 'Fisiológicos: ginecoobstétricos', '¿Cuándo fue su última menstruación?', 'c', { h1: 'Me empezó hace unas dos semanas.', h4: 'La última menstruación fue a los 51 años, hace nueve años; desde entonces nunca volví a sangrar.', '*': 'Hace unas dos semanas.' }, { sex: 'F' }),
        Q('go4', 'Fisiológicos: ginecoobstétricos', '¿Ha estado embarazada? ¿Cuántos embarazos, partos o abortos?', 'c', { h1: 'Nunca he estado embarazada: cero embarazos, cero partos, cero abortos.', h4: 'Dos embarazos y dos partos: el primero normal a los 26 años y el segundo por cesárea a los 30; ningún aborto. Mis hijos tienen 34 y 30 años.', '*': 'Nunca he estado embarazada.' }, { sex: 'F' }),
        Q('go7', 'Fisiológicos: ginecoobstétricos', '¿Ha llegado a la menopausia? ¿A qué edad y tuvo síntomas?', 'c', { h1: 'No, sigo menstruando con normalidad.', h4: 'Sí, a los 51 años. Tuve sofocos y sudores nocturnos durante un par de años, sin tratamiento hormonal; ahora ya no tengo nada.', '*': 'No, todavía no.' }, { sex: 'F' }),
        Q('go5', 'Fisiológicos: ginecoobstétricos', '¿Usa algún método anticonceptivo?', 'c', { h1: 'Tomo anticonceptivo oral combinado, una pastilla diaria, y uso preservativo con mi pareja.', h4: 'Ninguno; después de la menopausia ya no hace falta.', '*': 'Uso preservativo.' }, { sex: 'F' }),
        Q('go6', 'Fisiológicos: ginecoobstétricos', '¿Cuándo fue su última citología (Papanicolaou)?', 'c', { h1: 'Me la hice hace un año y salió normal.', h4: 'Hace dos años; salió normal.', '*': 'Hace un año; normal.' }, { sex: 'F' }),
        Q('go8', 'Fisiológicos: ginecoobstétricos', '¿Se ha hecho mamografía o densitometría ósea?', 'c', { h1: 'No, todavía no me corresponden; me reviso las mamas yo misma.', h4: 'Mamografía cada año por lo de mi madre: la última hace diez meses, normal. Densitometría todavía no me he hecho; quería preguntar por eso.', '*': 'No, todavía no.' }, { sex: 'F' }),
        Q('sx', 'Hábitos: sexualidad', '¿Tiene una vida sexual activa? ¿Usa protección?', 'c', ['Sí, con mi pareja estable desde hace tres años; usamos preservativo y yo tomo la pastilla. Nunca he tenido infecciones.', 'Sí, con mi esposa; relación estable y satisfactoria, sin problemas.', 'Sí, con mi esposa, con normalidad y sin molestias.', 'No tengo pareja desde hace unos años; no tengo molestias en ese sentido.']),
        Q('va1', 'Inmunizaciones', '¿Tiene su esquema de vacunación completo?', 'c', ['Sí, tengo todas las de la infancia y la del virus del papiloma humano.', 'Sí, las de la infancia y la de la hepatitis B.', 'Sí, las de la infancia y las que me ha recomendado mi médico.', 'Sí, las de la infancia; la de la hepatitis B me la pusieron en el trabajo hace años.']),
        Q('va2', 'Inmunizaciones', '¿Cuándo fue su última vacuna antitetánica?', 'c', ['Me pusieron el refuerzo hace dos años.', 'Hace seis años, cuando me hice una herida en una obra.', 'Hace ocho años me pusieron la Td (tétanos y difteria).', 'Hace cinco años, el refuerzo de tétanos y difteria.']),
        Q('va3', 'Inmunizaciones', '¿Se vacuna contra la gripe y el COVID-19?', 'c', ['Me vacuno de la gripe cada año y tengo el esquema de COVID-19 con refuerzo.', 'Me vacuné de la gripe el año pasado y tengo el esquema de COVID-19 completo.', 'Me pongo la de la gripe cada otoño y tengo cuatro dosis de COVID-19.', 'Me vacuno de la gripe todos los años y tengo el esquema de COVID-19 con refuerzos.']),
        Q('va4', 'Inmunizaciones', '¿Se ha vacunado contra el neumococo o el herpes zóster?', 'c', ['Todavía no me corresponden.', 'Aún no me corresponden; mi médico me dijo que más adelante.', 'Sí: neumococo hace tres años y las dos dosis de la vacuna del zóster hace un año.', 'Neumococo no; la del zóster me la recomendaron y pienso ponérmela este año.'])
      ]
    },
    {
      id: 'af', name: 'Antecedentes familiares (hereditarios)', short: 'Ant. familiares', qs: [
        Q('af1', '', '¿Hay alguna enfermedad que se repita en su familia?', 'o', ['En mi familia hay algo de tiroides y de diabetes; nada grave.', 'Sí: del corazón y la presión por parte de mi papá, y diabetes por parte de mi mamá.', 'Hipertensión y algo de diabetes; nada más importante.', 'Presión alta por parte de mi padre, y mi madre tuvo cáncer de mama.']),
        Q('af2', '', '¿Viven sus padres? ¿Qué enfermedades tienen o de qué fallecieron?', 'o', ['Mi madre tiene 55 años y toma pastillas para el tiroides (hipotiroidismo). Mi padre tiene 58 y la presión alta, controlada.', 'Mi padre falleció a los 72 años de un infarto; tenía la presión alta. Mi madre tiene 70 años y diabetes tipo 2.', 'Mi padre murió a los 80 años de una neumonía. Mi madre era hipertensa y falleció a los 86 por un derrame cerebral.', 'Mi padre falleció a los 82 años; tenía la presión alta. Mi madre tiene 84 años; tuvo cáncer de mama a los 68, la operaron y está bien.']),
        Q('af3', '', '¿Tiene hermanos o hijos? ¿Están sanos?', 'c', ['Tengo un hermano de 25 años, sano.', 'Tengo una hermana sana y dos hijos sanos.', 'Tengo un hermano mayor con diabetes tipo 2 y dos hijos sanos.', 'Tengo dos hermanas sanas, un hijo de 34 y una hija de 30, los dos sanos.']),
        Q('af4', '', '¿Algún familiar con diabetes, hipertensión o enfermedad del corazón?', 'c', ['Mi abuela materna tuvo diabetes tipo 2 y mi padre tiene la presión alta.', 'Sí: mi padre tuvo hipertensión e infarto; mi madre, diabetes.', 'Sí: hipertensión en mi madre y diabetes en mi hermano.', 'Mi padre tenía la presión alta; de diabetes o del corazón, nadie que yo sepa.']),
        Q('af5', '', '¿Algún familiar con cáncer? ¿De qué tipo y a qué edad?', 'c', ['No, que yo sepa nadie en mi familia ha tenido cáncer.', 'No, que yo sepa nadie en mi familia ha tenido cáncer.', 'No, que yo sepa nadie en mi familia ha tenido cáncer.', 'Sí, mi madre tuvo cáncer de mama a los 68 años; la operaron y está curada. Nadie más.']),
        Q('af6', '', '¿Algún familiar con enfermedad tiroidea, asma, enfermedades hereditarias o psiquiátricas?', 'c', ['Mi madre tiene hipotiroidismo; no hay enfermedades hereditarias ni psiquiátricas que yo sepa.', 'No, nada de eso.', 'No, nada de eso en mi familia.', 'No, nada de eso.']),
        Q('af7', '', '¿Alguien de su familia ha fallecido de forma repentina o a edad temprana?', 'c', ['No, nadie ha fallecido de forma repentina ni joven.', 'Mi padre murió de infarto a los 72 años, no tan joven; nadie más de forma repentina.', 'No, que yo sepa.', 'No, nadie.'])
      ]
    },
    {
      id: 'ps', name: 'Antecedentes socioeconómicos y de medio', short: 'Socioeconómicos', qs: [
        Q('ps1', '', '¿Cómo es su entorno familiar y quién le apoya?', 'o', ['Tengo buen apoyo: mis padres y mi pareja; veo a mi familia cada fin de semana.', 'Mi esposa y mis hijos son mi apoyo; tengo buena relación con todos.', 'Vivo con mi esposa y vemos a nuestros hijos y nietos cada semana; me siento muy acompañado.', 'Mi hija y mi nieto; también tengo dos hermanas con las que hablo casi a diario.']),
        Q('ps2', '', '¿Cómo es su trabajo: horario, esfuerzo físico, exposición a polvo, químicos o ruido?', 'o', ['Trabajo unas 8 o 9 horas frente a la pantalla, con pausas; paso mucho tiempo sentada y a veces tengo plazos de entrega.', 'Trabajo 9 horas: parte del día en obra, con casco y protección auditiva, algo de polvo, y parte en la oficina. Camino bastante.', 'Ya no trabajo; antes enseñaba de pie muchas horas. Ahora tengo mis actividades y mi huerto.', 'Trabajo 8 horas en oficina, sentada frente a la computadora; sin polvo ni ruido. Algo de estrés al cierre de mes.']),
        Q('ps3', '', '¿Cómo es su vivienda: agua potable, saneamiento, ventilación, mascotas?', 'o', ['Mi departamento tiene agua potable, drenaje y buena ventilación; tengo un gato vacunado.', 'Casa con agua potable, drenaje y luz, sin humedad. Tenemos un perro vacunado.', 'Casa propia con agua potable, buena ventilación y sin humedad; escaleras con barandilla. Sin mascotas.', 'Casa con agua potable, drenaje y buena ventilación; sin humedad y sin mascotas.']),
        Q('ps4', '', '¿Cómo está de ánimo últimamente? ¿Siente estrés?', 'o', ['Mi ánimo es bueno; el estrés es normal por las entregas, pero lo manejo con yoga.', 'Bien de ánimo; algo de estrés por los plazos de las obras, pero nada que me desborde.', 'Me siento animado y tranquilo; participo en un club de ajedrez y en un voluntariado.', 'Bien de ánimo; disfruto de mi nieto y de mis amigas. Algo de estrés en el trabajo a fin de mes, nada más.']),
        Q('ps5', '', '¿Cómo es un día típico para usted?', 'o', ['Me levanto a las 7, hago yoga o camino, trabajo por la mañana y por la tarde, y por la noche leo o veo series.', 'Me levanto a las 5:30, voy a la obra, como fuera, regreso a las 7 de la tarde y ceno con mi familia.', 'Camino por la mañana, me ocupo del huerto, almuerzo con mi esposa, leo y juego ajedrez por la tarde.', 'Me levanto a las 6:30, trabajo de 8 a 16, paso por el mercado, cuido un rato a mi nieto y leo por la noche.']),
        Q('ps6', '', '¿Se siente seguro/a en casa y en su entorno? ¿Ha sufrido algún tipo de violencia?', 'c', 'Sí, me siento seguro/a en casa y fuera; nunca he sufrido violencia.'),
        Q('ps7', '', '¿Ha viajado recientemente fuera de su ciudad o de su país?', 'c', ['No he viajado fuera del país en el último año.', 'He viajado a otra ciudad por trabajo, pero no al extranjero ni a zonas con enfermedades tropicales.', 'No he viajado, salvo ir a la costa unos días en verano.', 'No he viajado en el último año.']),
        Q('ps8', '', '¿Usa cinturón de seguridad, casco y protección solar?', 'c', ['Sí: casco cuando ando en bici, cinturón en el auto y protector solar.', 'Siempre uso cinturón al manejar y casco en la obra.', 'Sí, siempre uso cinturón y no manejo de noche.', 'Siempre uso cinturón; protector solar cuando voy a la playa.']),
        Q('ps9', '', '¿Tiene seguro médico o cómo accede a la atención de salud?', 'c', ['Tengo seguro médico privado y me alcanza para mis gastos.', 'Tengo seguro médico a través de la empresa.', 'Tengo la cobertura de la seguridad social por mi jubilación y mis ahorros me alcanzan.', 'Tengo seguro médico por mi trabajo.']),
        Q('ps10', '', '¿Es independiente para sus actividades diarias? ¿Ha tenido caídas?', 'c', ['Sí, totalmente independiente y sin caídas.', 'Sí, totalmente independiente y sin caídas.', 'Soy completamente independiente para todo y no he tenido caídas en el último año.', 'Sí, totalmente independiente y sin caídas.'])
      ]
    },
    {
      id: 'ros', name: 'Anamnesis por aparatos y sistemas', short: 'Aparatos y sistemas', qs: [
        Q('g1', 'General', '¿Ha tenido fiebre o escalofríos?', 'c', 'No, no he tenido fiebre ni escalofríos.'),
        Q('g2', 'General', '¿Ha perdido o ganado peso sin proponérselo?', 'c', ['No, mi peso se mantiene en unos 58 kilos.', 'No, peso unos 77 kilos desde hace años.', 'No, me mantengo en 72 kilos.', 'No, peso unos 61 kilos desde hace años.']),
        Q('g3', 'General', '¿Se siente más cansado/a de lo habitual?', 'c', 'No, tengo energía normal para mi día a día.'),
        Q('g4', 'General', '¿Cómo está su apetito?', 'o', 'Mi apetito es normal.'),
        Q('g5', 'General', '¿Suda por la noche sin motivo?', 'c', { h4: 'No; cuando empezó la menopausia sí sudaba de noche, pero hace años que no.', '*': 'No, no sudo por la noche.' }),
        Q('c1', 'Cardiovascular', '¿Ha sentido dolor u opresión en el pecho?', 'c', 'No, nunca he sentido dolor ni opresión en el pecho.'),
        Q('c2', 'Cardiovascular', '¿Siente que el corazón late rápido o raro sin hacer esfuerzo?', 'c', 'No, solo se acelera cuando hago ejercicio, como a todos.'),
        Q('c3', 'Cardiovascular', '¿Se queda sin aire al subir escaleras o caminar rápido?', 'c', ['No, subo escaleras y hago ejercicio sin quedarme sin aire.', 'No, subo escaleras sin problema.', 'Subo dos pisos a mi ritmo, sin quedarme sin aire.', 'No, subo escaleras sin problema.']),
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
        Q('d5', 'Digestivo', '¿Cómo es su hábito evacuatorio (catarsis): frecuencia y aspecto de las heces?', 'o', ['Voy al baño una vez al día; las heces son normales, de color marrón.', 'Voy al baño una vez al día, por la mañana, con heces normales.', 'Voy una vez al día, con heces normales; sin estreñimiento ni diarrea.', 'Voy al baño una vez al día, con heces normales.']),
        Q('d6', 'Digestivo', '¿Ha visto heces negras o con sangre?', 'c', 'No, nunca he visto heces negras ni con sangre.'),
        Q('d7', 'Digestivo', '¿Ha notado la piel o los ojos amarillos?', 'c', 'No, nunca.'),
        Q('u1', 'Genitourinario', '¿Le arde o le duele al orinar?', 'c', 'No, no me arde al orinar.'),
        Q('u2', 'Genitourinario', '¿Cuántas veces orina al día (diuresis) y se levanta de noche a orinar?', 'c', ['Unas 5 o 6 veces al día y no me levanto de noche.', 'Unas 5 o 6 veces al día y no me levanto de noche.', 'Unas 6 veces al día y no me levanto por la noche.', 'Unas 5 o 6 veces al día y no me levanto de noche.']),
        Q('u3', 'Genitourinario', '¿Ha visto sangre en la orina?', 'c', 'No, nunca he visto sangre en la orina.'),
        Q('u4', 'Genitourinario', '¿Se le escapa la orina sin querer?', 'c', { h4: 'No, ni al toser ni al reír; no se me escapa.', '*': 'No, no se me escapa.' }),
        Q('u5', 'Genitourinario', '¿Tiene flujo vaginal anormal, dolor pélvico o sangrado fuera de la regla?', 'c', { h4: 'No: ni flujo anormal ni dolor pélvico, y desde la menopausia nunca he vuelto a sangrar. Solo algo de sequedad vaginal, sin molestias.', '*': 'No, no tengo flujo anormal, ni dolor pélvico, ni sangrados fuera de la regla.' }, { sex: 'F' }),
        Q('u6', 'Genitourinario', '¿Tiene dificultad para iniciar el chorro, dolor testicular o secreción por la uretra?', 'c', 'No, el chorro es normal, sin esfuerzo ni goteo al final; sin dolor testicular ni secreción.', { sex: 'M' }),
        Q('n1', 'Neurológico', '¿Tiene dolores de cabeza?', 'c', 'No, no tengo dolores de cabeza importantes.'),
        Q('n2', 'Neurológico', '¿Siente mareos o que todo da vueltas?', 'c', 'No, no tengo mareos ni sensación de giro.'),
        Q('n3', 'Neurológico', '¿Ha perdido el conocimiento o ha tenido convulsiones?', 'c', 'No, nunca.'),
        Q('n4', 'Neurológico', '¿Siente hormigueos o adormecimiento en brazos o piernas?', 'c', 'No, no tengo hormigueos ni adormecimientos.'),
        Q('n5', 'Neurológico', '¿Nota debilidad o pesadez en algún brazo o pierna?', 'c', 'No, no noto debilidad.'),
        Q('n6', 'Neurológico', '¿Ve y oye bien?', 'c', ['Sí, veo y oigo bien.', 'Sí, veo y oigo bien.', 'Uso anteojos para leer de cerca, pero veo y oigo bien para mi edad.', 'Uso anteojos para leer de cerca desde los 45 años; oigo bien.']),
        Q('n7', 'Neurológico', '¿Tiene temblores o problemas de memoria?', 'c', ['No, ni temblores ni problemas de memoria.', 'No, ni temblores ni problemas de memoria.', 'Mi memoria está bien; a veces se me olvida un nombre, como a todos, pero nada que afecte mi día.', 'No, ni temblores ni problemas de memoria.']),
        Q('m1', 'Osteoarticular y muscular', '¿Le duelen las articulaciones?', 'c', 'No, no me duelen las articulaciones.'),
        Q('m2', 'Osteoarticular y muscular', '¿Amanece con las articulaciones tiesas?', 'c', 'No, no amanezco con rigidez.'),
        Q('m3', 'Osteoarticular y muscular', '¿Tiene dolor de espalda o de cuello?', 'c', ['No; me estiro cada hora cuando trabajo sentada.', 'No, no tengo dolor de espalda ni de cuello.', 'No, no tengo dolor de espalda ni de cuello.', 'No; me levanto a caminar cada rato en la oficina y no me duele.']),
        Q('m4', 'Osteoarticular y muscular', '¿Se le hincha o se le bloquea alguna articulación?', 'c', 'No, me muevo sin limitación.'),
        Q('m5', 'Osteoarticular y muscular', '¿Tiene calambres frecuentes o debilidad muscular?', 'c', 'No, no tengo calambres frecuentes ni debilidad.'),
        Q('p1', 'Piel', '¿Ha notado lunares nuevos o que hayan cambiado de forma o color?', 'c', 'No he notado lunares nuevos ni cambios.'),
        Q('p2', 'Piel', '¿Tiene picor, ronchas o erupciones en la piel?', 'c', 'No, no me pica ni me salen ronchas.'),
        Q('p3', 'Piel', '¿Se le cae el pelo o tiene cambios en las uñas?', 'c', 'No, el pelo y las uñas están normales.'),
        Q('e1', 'Endocrino', '¿Tiene más sed de lo normal o orina en exceso?', 'c', 'No, no tengo más sed de lo habitual ni orino en exceso.'),
        Q('e2', 'Endocrino', '¿Tolera bien el frío y el calor?', 'c', 'Sí, los tolero como los demás.'),
        Q('e3', 'Endocrino', '¿Tiene sudores excesivos, temblor o palpitaciones sin causa?', 'c', 'No, nada de eso.'),
        Q('e4', 'Endocrino', '¿Ha notado cambios en la voz, el pelo o el cuello (bulto)?', 'c', 'No, no he notado cambios.'),
        Q('y1', 'Psíquico', '¿Se ha sentido triste, sin ganas o sin interés por sus cosas?', 'c', 'No, disfruto de mis actividades y me siento con ánimo.'),
        Q('y2', 'Psíquico', '¿Se siente nervioso/a o con angustia con frecuencia?', 'c', ['No; solo me pongo algo nerviosa en las entregas, como cualquiera.', 'No, estoy tranquilo; solo algo de estrés en el trabajo.', 'No, estoy tranquilo.', 'No, estoy tranquila.']),
        Q('y3', 'Psíquico', '¿Tiene dificultad para dormir?', 'c', { h4: 'No; a veces me despierto de madrugada, pero me vuelvo a dormir enseguida.', '*': 'No, duermo bien.' }),
        Q('y4', 'Psíquico', '¿Ha tenido pensamientos de hacerse daño o de que no vale la pena vivir?', 'c', 'No, nunca he tenido pensamientos así.')
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
  const ACTS = ['greet', 'empathy', 'more', 'summary', 'close'];
  /* Progreso: cada pregunta del banco (hecha a cualquier paciente) y cada acción de comunicación. */
  const PROGRESS_TOTAL = ALLQ.length + ACTS.length;
  const REFS = [
    'Argente HA, Álvarez ME. <i>Semiología Médica. Fisiopatología, semiotecnia y propedéutica</i>. Panamericana — La historia clínica: anamnesis (datos de filiación, motivo de consulta, enfermedad actual, antecedentes personales y familiares, anamnesis por aparatos y sistemas); la entrevista médico-paciente.',
    'OMS. Clasificación del estado nutricional por IMC (datos de talla y peso de cada paciente).'
  ];

  const ansFor = (q, c) => {
    const i = CASES.indexOf(c);
    let a = q.ans;
    if (typeof a === 'function') a = a(c);
    if (Array.isArray(a)) a = a[i] != null ? a[i] : a[0];
    else if (a && typeof a === 'object') a = a[c.id] != null ? a[c.id] : a['*'];
    // concordancia de género en frases neutras
    a = String(a == null ? '' : a).replace(/o\/a\b/g, c.sex === 'F' ? 'a' : 'o');
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
    const ROS_SEC = SECS.find(s => s.id === 'ros');
    const rosGroupPct = g => {
      const qs = qsFor(ROS_SEC, S.c).filter(q => q.g === g);
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
        reply = 'Eso ya se lo comenté: ' + ansFor(q, c).replace(/^./, m => m.toLowerCase());
      } else {
        S.asked.add(q.id);
        if (q.t === 'o') S.cnt.open++; else S.cnt.closed++;
        reply = ansFor(q, c);
        const sec = SECS.find(s => s.id === q.sec), r = secPct(sec);
        if (r.p === 100) S.sh.log(`Sección completa: <b>${esc(sec.name)}</b> (${r.t} preguntas).`, 'find');
      }
      S.sh.explored('q:' + q.id);
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
      ['Gracias, la verdad estoy tranquila, pero se agradece.', 'Gracias; sí me preocupa un poco lo del corazón por mi papá.', 'Muy amable, gracias; me siento cómodo.', 'Gracias; sí me inquieta un poco lo de las mamas, por mi madre.'],
      ['Gracias, me da confianza.', 'Se lo agradezco; me tranquiliza que me lo diga.', 'Gracias, siempre es bueno que le escuchen a uno.', 'Se lo agradezco; me tranquiliza hablarlo.'],
      ['Gracias, lo tendré en cuenta.', 'Gracias; si algo me inquieta se lo digo.', 'Se lo agradezco, de verdad.', 'Gracias; si algo me preocupa se lo digo.']
    ];
    const MOREA = ['No, creo que le conté todo. Solo me gustaría saber cómo cuidar mi espalda trabajando sentada.', 'Solo eso: que me confirme si mi corazón está bien.', 'No, nada más; muchas gracias.', 'Solo quería saber si ya me corresponde la densitometría ósea y qué otros controles debo hacerme a mi edad.'];
    const byCase = arr => (arr[S.ci] != null ? arr[S.ci] : arr[0]);

    function act(id) {
      const c = S.c;
      S.sh.explored('act:' + id);
      if (id === 'greet') {
        S.sk.greet = true;
        pushMsg('dr', `Buenos días. Soy estudiante de medicina y voy a hacerle su historia clínica; todo lo que me cuente es confidencial. ¿Usted es ${esc(c.first)}?`, 'saludo');
        patientSays('Buenos días, sí, soy yo. Encantado de conocerle.'.replace('Encantado', c.sex === 'F' ? 'Encantada' : 'Encantado'));
      } else if (id === 'empathy') {
        const k = S.cnt.empathy % 3; S.cnt.empathy++; S.sk.empathy = true;
        pushMsg('dr', esc(EMP[k]), 'empatía');
        patientSays(esc(byCase(EMPR[k])));
      } else if (id === 'more') {
        S.sk.more = true;
        pushMsg('dr', '¿Hay algo más que quiera contarme o preguntarme antes de terminar?', 'cierre abierto');
        patientSays(esc(byCase(MOREA)));
      } else if (id === 'summary') {
        const done = SECS.filter(s => secPct(s).p >= 50), pend = SECS.filter(s => secPct(s).p < 50);
        pushMsg('dr', done.length
          ? `Si le he entendido bien, usted consulta por un control sin síntomas y hemos repasado: ${esc(done.map(s => s.short.toLowerCase()).join(', '))}. ¿Es correcto o quiere añadir algo?`
          : 'Si le he entendido bien, usted viene a un control. ¿Es correcto?', 'resumen');
        if (done.length >= 3) S.sk.summary = true;
        patientSays(done.length >= 3
          ? 'Sí, así es.' + (pend.length ? ` Aunque todavía no hemos hablado de ${esc(pend.map(s => s.short.toLowerCase()).join(', '))}.` : '')
          : 'Sí, aunque todavía hemos hablado de muy pocas cosas.');
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
      if (!t.length) t.push(cov >= 70 ? 'Buen trabajo: mantén un lenguaje claro y completa las secciones pendientes.' : 'Sigue el orden de la historia clínica: Filiación → Motivo de consulta → Enfermedad actual → Antecedentes personales → familiares → socioeconómicos → Aparatos y sistemas.');
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
          <h4>Anamnesis por aparatos y sistemas (por aparato)</h4>
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
            ${L ? `<h4>Estructura de la historia clínica (Argente-Álvarez)</h4>
            <ol style="margin:0;padding-left:20px;font-size:13.5px">
              <li><b>Datos de filiación</b>: nombre, edad, sexo, estado civil, ocupación, procedencia y domicilio, nivel de instrucción.</li>
              <li><b>Motivo de consulta</b>: el síntoma o la razón, con las palabras del paciente.</li>
              <li><b>Enfermedad actual</b> y sus antecedentes: cada síntoma con forma de inicio, localización, carácter, intensidad, irradiación, evolución, factores que lo modifican y síntomas acompañantes (regla nemotécnica ALICIA o SOCRATES).</li>
              <li><b>Antecedentes personales</b>: <i>fisiológicos</i> (nacimiento, crecimiento y desarrollo; en la mujer menarca, ciclos, embarazos y partos, menopausia), <i>patológicos</i> (enfermedades de la infancia y del adulto, quirúrgicos, traumáticos, alérgicos, transfusiones), <i>medicación</i>, <i>hábitos</i> (alimentación, catarsis, diuresis, sueño, tabaco, alcohol, drogas, actividad física, sexualidad) e <i>inmunizaciones</i>.</li>
              <li><b>Antecedentes familiares</b> (hereditarios): padres, hermanos, hijos; enfermedades y causas de muerte.</li>
              <li><b>Antecedentes socioeconómicos y de medio</b>: vivienda, trabajo y exposiciones, apoyo familiar, cobertura de salud, viajes.</li>
              <li><b>Anamnesis por aparatos y sistemas</b>: revisión ordenada de síntomas no referidos espontáneamente.</li>
              <li>Examen físico → impresión diagnóstica → estudios complementarios → plan.</li></ol>` : ''}
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
    /* Cuestionario (8 preguntas; dos dependen del paciente: índice tabáquico y antecedente quirúrgico). */
    const PACKS = { h1: 0, h2: 2.5, h3: 0, h4: 10 };     // cig/día ÷ 20 × años: Roberto 5 ÷ 20 × 10; Teresa 10 ÷ 20 × 20
    const PACK_OPTS = ['0 (nunca fumó)', '2,5 paquetes-año', '5 paquetes-año', '10 paquetes-año'];
    const CIR_OPTS = ['Ninguna', 'Apendicectomía', 'Hernioplastia inguinal', 'Cesárea'];
    const CIR_IDX = { ninguna: 0, apendice: 1, hernia: 2, cesarea: 3 };
    const QUIZ = c => {
      const packs = PACKS[c.id] != null ? PACKS[c.id] : 0;
      const pIdx = packs === 0 ? 0 : packs === 2.5 ? 1 : packs === 5 ? 2 : 3;
      const fem = c.sex === 'F';
      return [
        { q: '¿Cuál es el orden correcto del método clínico?', options: ['Examen físico → anamnesis → impresión diagnóstica', 'Anamnesis → examen físico → impresión diagnóstica', 'Impresión diagnóstica → anamnesis → examen físico', 'Estudios de laboratorio → anamnesis → examen físico'], a: 1, why: 'La anamnesis orienta el examen físico y ambos sustentan la impresión diagnóstica; después se piden estudios complementarios y se plantea el plan.' },
        { q: 'Según Argente-Álvarez, la menarca, los embarazos y la menopausia se registran en…', options: ['Enfermedad actual', 'Antecedentes familiares (hereditarios)', 'Anamnesis por aparatos y sistemas', 'Antecedentes personales fisiológicos'], a: 3, why: 'Los antecedentes personales se dividen en fisiológicos (nacimiento, desarrollo, menarca, ciclos, embarazos, menopausia), patológicos, medicación, hábitos e inmunizaciones.' },
        { q: 'En el abdomen el orden de las técnicas de exploración es', options: ['Auscultación, inspección, percusión, palpación', 'Inspección, palpación, percusión, auscultación', 'Inspección, auscultación, percusión, palpación', 'Palpación, percusión, auscultación, inspección'], a: 2, why: 'En el abdomen se ausculta antes de percutir y palpar, porque estas maniobras pueden modificar los ruidos hidroaéreos; en el resto del cuerpo el orden es inspección, palpación, percusión, auscultación.' },
        { q: '¿Cuál es una pregunta abierta?', options: ['¿Tiene fiebre?', '¿Qué le trae hoy por aquí?', '¿Le duele el pecho al caminar?', '¿Fuma?'], a: 1, why: 'Las preguntas abiertas no se contestan con sí/no y dejan que el paciente cuente su historia; se usan al inicio, y las cerradas después para precisar.' },
        { q: 'Al caracterizar un síntoma en la enfermedad actual se debe precisar…', options: ['Solo la intensidad y la duración', 'Forma de inicio, localización, carácter, intensidad, irradiación, evolución, factores que lo modifican y síntomas acompañantes', 'Únicamente los antecedentes familiares relacionados', 'La impresión diagnóstica antes de seguir preguntando'], a: 1, why: 'Es la descripción semiológica completa del síntoma; las reglas nemotécnicas ALICIA (Aparición, Localización, Intensidad, Carácter, Irradiación, Atenuantes/agravantes) o SOCRATES ayudan a no omitir nada.' },
        { q: `Con lo que ${fem ? 'la paciente' : 'el paciente'} refirió sobre el tabaco, su índice tabáquico es…`, options: PACK_OPTS, a: pIdx, why: `Paquetes-año = cigarrillos por día ÷ 20 × años fumados. ${packs === 0 ? 'Nunca fumó: 0.' : packs === 2.5 ? '5 ÷ 20 × 10 años = 2,5.' : '10 ÷ 20 × 20 años = 10.'}` },
        { q: 'Cuando el paciente expresa una preocupación, lo más adecuado es', options: ['Cambiar de tema para ahorrar tiempo', 'Tranquilizarlo de inmediato sin escucharlo', 'Usar términos técnicos para dar seguridad', 'Reconocer su emoción y explorarla (empatía)'], a: 3, why: 'Reconocer la emoción («Entiendo que le preocupe...») fortalece la relación y mejora la información obtenida.' },
        { q: `¿Qué antecedente quirúrgico refiere ${fem ? 'la' : 'el'} paciente?`, options: CIR_OPTS, a: CIR_IDX[c.ficha.cir] != null ? CIR_IDX[c.ficha.cir] : 0, why: 'Los antecedentes quirúrgicos se registran con el tipo de operación, la edad o fecha y las complicaciones; pregúntalo siempre, aunque la persona esté sana.' }
      ];
    };

    function recordHTML(c) {
      reset(c);
      const qs = QUIZ(c);
      return `<div class="his-rec">
        <h5>Datos de filiación</h5>
        <label class="field">Nombre completo</label><input class="his-in" type="text" data-f="nombre" autocomplete="off">
        <label class="field">Estado civil</label>${sel('civil', OPT.civil)}
        <label class="field">Ocupación</label><input class="his-in" type="text" data-f="ocup" autocomplete="off">
        <label class="field">Convive con</label>${sel('convive', OPT.convive)}
        <h5>Motivo de consulta</h5>${sel('motivo', OPT.motivo)}
        <h5>Antecedentes personales</h5>
        <label class="field">Patológicos: enfermedades</label>${sel('enf', OPT.enf)}
        <label class="field">Quirúrgicos</label>${sel('cir', OPT.cir)}
        <label class="field">Alérgicos</label>${sel('ale', OPT.ale)}
        <label class="field">Medicación habitual</label>${sel('med', OPT.med)}
        <label class="field">Hábitos: tabaco</label>${sel('tab', OPT.tab)}
        <label class="field">Hábitos: alcohol</label>${sel('alc', OPT.alc)}
        <label class="field">Hábitos: actividad física</label>${sel('eje', OPT.eje)}
        <h5>Antecedentes familiares (marca los presentes)</h5>
        <div class="his-chkgrid">${FAM.map(([k, n]) => `<label><input type="checkbox" data-fam="${k}"> ${esc(n)}</label>`).join('')}</div>
        <h5>Anamnesis por aparatos y sistemas (marca los que refieren síntomas)</h5>
        <div class="his-chkgrid">${ROSSYS.map(([k, n]) => `<label><input type="checkbox" data-ros="${k}"> ${esc(n)}</label>`).join('')}</div>
        <h5>Cuestionario</h5>
        ${qs.map((q, i) => `<label class="field">${i + 1}. ${esc(q.q)}</label>
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
      rows += row('Sistemas con síntomas', ros.join(', ') || 'ninguno', 'ninguno (anamnesis por sistemas negativa)', ros.length === 0, 'ros');

      const qs = QUIZ(c);
      let qok = 0;
      const qrows = qs.map((q, i) => {
        const el = rec.querySelector(`select[data-q="${i}"]`), v = el ? el.value : '', good = v !== '' && +v === q.a;
        if (good) qok++;
        return `<li>${good ? '<span class="m-ok">✔</span>' : '<span class="m-bad">✘</span>'} <b>${esc(q.options[q.a])}</b>. ${esc(q.why)}</li>`;
      }).join('');

      const secList = SECS.map(s => { const r = secPct(s); return `<li>${esc(s.short)}: <b>${r.p} %</b> (${r.n}/${r.t})</li>`; }).join('');
      const com = [
        [S.sk.greet, 'Saludo y presentación'], [S.firstType === 'o', 'Primera pregunta abierta'], [S.total > 0 && S.cnt.jargon === 0, 'Lenguaje claro'],
        [S.sk.empathy, 'Empatía'], [S.sk.more, '«¿Algo más?»'], [S.sk.summary, 'Resumen final'], [S.sk.close, 'Cierre']
      ];
      const pend = SECS.filter(s => secPct(s).p < 100).map(s => s.short);
      const html = `<h4>Comparación con la ficha del paciente</h4>
        <table class="res"><tr><th>Campo</th><th>Tu registro</th><th>Real</th><th></th></tr>${rows}</table>
        <p><b>${ok}</b> de ${tot} campos coinciden.</p>
        <h4>Cuestionario</h4><p><b>${qok}</b> de ${qs.length} correctas.</p><ul>${qrows}</ul>
        <h4>Cobertura de la entrevista · ${totalPct()} %</h4><ul>${secList}</ul>
        ${pend.length ? `<p style="font-size:12.5px;color:var(--muted)">Secciones incompletas: ${esc(pend.join(', '))}.</p>` : ''}
        <h4>Comunicación</h4><ul>${com.map(([g, n]) => `<li>${g ? '<span class="m-ok">✔</span>' : '<span class="m-bad">✘</span>'} ${esc(n)}</li>`).join('')}</ul>
        <p style="font-size:12.5px;color:var(--muted)">Preguntas abiertas: ${S.cnt.open} · cerradas: ${S.cnt.closed} · repetidas: ${S.cnt.repeat} · con jerga: ${S.cnt.jargon}.</p>`;
      return { html, ok: ok + qok, total: tot + qs.length };
    }

    const sh = new Shell(root, {
      id: 'history', progressTotal: PROGRESS_TOTAL, refs: REFS,
      cases: CASES,
      scenes: { interview, cover, method },
      order: ['interview', 'cover', 'method'],
      hideDx: true,
      checkLabel: 'Comprobar mis respuestas', recordTitle: 'Mis hallazgos · historia clínica', patientTitle: 'Paciente virtual',
      caseLabel: (c, i) => `Paciente ${i + 1} · ${c.age} años, ${c.sex}`,
      record: recordHTML, evaluate,
      teaching: [
        'Abre con preguntas abiertas («¿Qué le trae hoy por aquí?») y deja hablar sin interrumpir; después precisa con preguntas cerradas (embudo de la entrevista).',
        'Estructura de la historia clínica: datos de filiación → motivo de consulta → enfermedad actual → antecedentes personales (fisiológicos, patológicos, medicación, hábitos, inmunizaciones) → antecedentes familiares → antecedentes socioeconómicos y de medio → anamnesis por aparatos y sistemas.',
        'Cada síntoma se caracteriza por forma de inicio, localización, carácter, intensidad, irradiación, evolución, factores que lo modifican y síntomas acompañantes (ALICIA / SOCRATES); en una persona sana la enfermedad actual confirma que no hay síntoma.',
        'En los antecedentes cuantifica: paquetes-año (cigarrillos/día ÷ 20 × años), cantidad y frecuencia de alcohol, tipo y fecha de cirugías, reacción de cada alergia, dosis de cada fármaco; en la mujer, menarca, ritmo menstrual, fecha de la última menstruación, gestas/partos/abortos y menopausia.',
        'Usa lenguaje claro, muestra empatía, resume con las palabras del paciente y pregunta «¿hay algo más?» antes de cerrar. Método clínico: anamnesis → examen físico → impresión diagnóstica → estudios complementarios → plan.'
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
    desc: 'Entrevista a cuatro pacientes virtuales sanos y construcción de la historia clínica con la estructura de Argente-Álvarez.',
    bullets: ['Banco de preguntas por secciones (filiación, motivo, enfermedad actual, antecedentes, aparatos y sistemas) con cobertura en vivo', 'Antecedentes fisiológicos, patológicos, hábitos, familiares y socioeconómicos; paciente posmenopáusica', 'Comunicación: preguntas abiertas, lenguaje claro, empatía, resumen', 'Método clínico y orden de la exploración (inspección, palpación, percusión, auscultación; abdomen)'],
    refs: REFS,
    mount: root => mount(root)
  });
})();
