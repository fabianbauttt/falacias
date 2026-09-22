// Capa de datos de Cazafalacias: las 4 familias temáticas, las 12 falacias
// y el banco de 36 enunciados de práctica. Módulo de solo datos — sin
// lógica de UI ni acceso al DOM, para que app.js (u otra vista futura)
// pueda consumirlo sin arrastrar nada de renderizado.
//
// Nota de refactorización: además de CATS, FALLACIES y PRACTICE se exporta
// también CAT_ORDER, que en el archivo original vivía junto a CATS dentro
// del mismo script. Es el orden fijo en que se muestran las 4 familias
// (tanto en el selector como en el catálogo), así que es tan "dato" como
// las propias familias y app.js lo necesita para renderizar en el orden
// correcto.

export const CATS = {
  ataque: {label:"Ataques y distracciones", varName:"--cat1", soft:"--cat1-soft",
    desc:"Falacias que distraen del argumento real: atacan a la persona, exageran su postura o saltan a una conclusión que no se conecta con las razones dadas."},
  presion: {label:"Presión social y autoridad", varName:"--cat2", soft:"--cat2-soft",
    desc:"Falacias que reemplazan las razones por presión: apelan a quién lo dice, a cuánta gente lo cree, o a lo que sentimos, en vez de si el argumento es válido."},
  causa: {label:"Errores de causa y evidencia", varName:"--cat3", soft:"--cat3-soft",
    desc:"Falacias que fallan al conectar evidencia con conclusión: confunden coincidencia con causa, generalizan de muy pocos casos, o confunden falta de prueba con prueba."},
  estructura: {label:"Trampas de estructura lógica", varName:"--cat4", soft:"--cat4-soft",
    desc:"Falacias que fuerzan la forma del argumento: reducen las opciones a dos, inventan una cadena de consecuencias, o dan por demostrado lo que había que probar."}
};

export const CAT_ORDER = ["ataque","presion","causa","estructura"];

export const FALLACIES = [
  {id:"adhominem", name:"Ad hominem", cat:"ataque",
    hook:"Atacar a la persona, no su argumento.",
    def:"Atacar el carácter, la apariencia o la vida personal de quien argumenta, en lugar de responder al argumento mismo.",
    why:"Que alguien tenga defectos no vuelve falsas sus razones. El argumento hay que evaluarlo por su contenido, no por quién lo dice.",
    example:"¿Cómo le vamos a hacer caso al profesor de biología sobre el cambio climático si ni siquiera recicla en su casa?"},
  {id:"hombrepaja", name:"Hombre de paja", cat:"ataque",
    hook:"Deformar el argumento del otro para tumbarlo fácil.",
    def:"Exagerar o deformar la posición de alguien para que sea más fácil de atacar, y luego derrotar esa versión falsa como si fuera la real.",
    why:"Se gana el debate contra un argumento que nadie defendió, no contra el argumento real.",
    example:"Mi hermana solo dijo que comiéramos menos carne los fines de semana, y ya la acusan de querer que todos seamos veganos y dejemos morir a los ganaderos del país."},
  {id:"envenenarpozo", name:"Envenenar el pozo", cat:"ataque",
    hook:"Desacreditar a alguien antes de que hable, para que nadie le crea.",
    def:"Presentar información negativa sobre una persona antes de que exponga su argumento, para que la audiencia lo rechace de entrada sin evaluarlo.",
    why:"Descalificar por adelantado no responde a lo que la persona realmente va a decir; predispone en contra sin dar ninguna razón sobre el contenido de su argumento.",
    example:"Antes de que mi compañero presente su propuesta, les cuento que él nunca cumple con nada, así que ya se imaginarán qué tan buena es su idea."},
  {id:"autoridad", name:"Apelación a la autoridad", cat:"presion",
    hook:"Cierto porque lo dijo alguien famoso o poderoso.",
    def:"Afirmar que algo es verdadero solo porque lo dice una persona famosa o con poder, aunque no sea experta en ese tema.",
    why:"La autoridad de alguien en un campo no lo hace confiable en otro, y ni siquiera un experto real está exento de equivocarse.",
    example:"Ese jugador de fútbol dijo en una entrevista que la Tierra tiene solo seis mil años, así que debe ser cierto."},
  {id:"popularidad", name:"Apelación a la popularidad", cat:"presion",
    hook:"Cierto porque todo el mundo lo cree o lo hace.",
    def:"Sostener que una idea es verdadera o correcta simplemente porque mucha gente la cree o la practica.",
    why:"Que algo sea popular no dice nada sobre si es cierto o correcto; una mayoría también se puede equivocar.",
    example:"Todo el salón está copiando en el examen, entonces no puede estar tan mal hacerlo."},
  {id:"emocion", name:"Apelación a la emoción", cat:"presion",
    hook:"Convencer con miedo o lástima, no con razones.",
    def:"Buscar convencer generando miedo, lástima, indignación o culpa, en lugar de dar razones sobre el asunto en cuestión.",
    why:"Una emoción intensa no es evidencia de que algo sea verdadero; puede convencer sin que el argumento tenga ningún sustento real.",
    example:"Profesor, si me pone esa nota mis papás me van a castigar todo el semestre y no voy a poder salir con mis amigos nunca más."},
  {id:"falsacausa", name:"Falsa causa", cat:"causa",
    hook:"Pasó antes, entonces lo causó.",
    def:"Asumir que porque un evento ocurrió antes que otro, el primero causó el segundo (post hoc ergo propter hoc).",
    why:"La simple secuencia en el tiempo no prueba una relación de causa y efecto; puede ser coincidencia o haber otra causa real detrás.",
    example:"Desde que ese equipo cambió de técnico ha perdido tres partidos seguidos; el problema es claramente el nuevo técnico."},
  {id:"generalizacion", name:"Generalización apresurada", cat:"causa",
    hook:"Unos pocos casos, una conclusión sobre todos.",
    def:"Sacar una conclusión general sobre todo un grupo a partir de muy pocos casos o de una muestra que no lo representa.",
    why:"Unos pocos ejemplos no bastan para probar algo sobre todo un grupo; se necesita evidencia más amplia y representativa.",
    example:"Los dos taxistas que me atendieron esta semana fueron groseros, así que todos los taxistas de la ciudad son así."},
  {id:"ignorancia", name:"Apelación a la ignorancia", cat:"causa",
    hook:"Nadie lo ha refutado, entonces es cierto.",
    def:"Afirmar que algo es verdadero porque no se ha demostrado que sea falso, o al revés.",
    why:"La falta de evidencia en contra de algo no es evidencia a favor de eso; simplemente no se sabe todavía.",
    example:"Nadie ha podido probar que los fantasmas no existen, así que deben existir."},
  {id:"falsodilema", name:"Falso dilema", cat:"estructura",
    hook:"Solo dos opciones, cuando en realidad hay más.",
    def:"Presentar solo dos opciones posibles como si fueran las únicas, cuando en realidad existen más alternativas.",
    why:"Reducir un asunto a blanco o negro oculta otras opciones razonables que también podrían ser válidas.",
    example:"En el trabajo en grupo, o hacemos todo exactamente como yo digo, o no lo entregamos a tiempo."},
  {id:"pendiente", name:"Pendiente resbaladiza", cat:"estructura",
    hook:"Un paso pequeño llevará a una catástrofe, sin pruebas.",
    def:"Argumentar que un primer paso, aparentemente inofensivo, llevará inevitablemente a una cadena de consecuencias graves.",
    why:"Se da por hecho un encadenamiento de eventos sin mostrar evidencia real de que cada paso lleve necesariamente al siguiente.",
    example:"Si te dejan llegar cinco minutos tarde hoy, mañana van a querer llegar una hora tarde, y en un mes nadie va a venir a clase."},
  {id:"peticion", name:"Petición de principio", cat:"estructura",
    hook:"La conclusión ya estaba metida en la premisa.",
    def:"Dar por probada la conclusión dentro de las mismas premisas, de modo que el argumento no demuestra nada nuevo (razonamiento circular).",
    why:"La conclusión ya estaba asumida desde el principio, así que el argumento gira en círculos en vez de aportar una razón independiente.",
    example:"Sé que este horóscopo es confiable porque lo dice el propio horóscopo en su introducción."}
];

export const PRACTICE = [
  ["adhominem","¿Cómo le vamos a hacer caso al profesor de biología sobre el cambio climático si ni siquiera recicla en su casa?"],
  ["adhominem","No puedo creer en lo que dice sobre economía, si ni siquiera terminó el colegio."],
  ["adhominem","¿Por qué le haríamos caso al capitán del equipo sobre la nueva estrategia, si además de que juega mal es súper antipático?"],
  ["hombrepaja","Mi hermana solo dijo que comiéramos menos carne los fines de semana, y ya la acusan de querer que todos seamos veganos y dejemos morir a los ganaderos del país."],
  ["hombrepaja","Mi mamá me dijo que estudiara más los fines de semana; o sea que quiere que no tenga vida social nunca."],
  ["hombrepaja","El candidato solo propuso subir el peaje de una vía específica, pero ya andan diciendo que quiere que todos paguemos el doble de impuestos en todas partes."],
  ["envenenarpozo","Antes de escuchar la propuesta de mi compañero de curso, les recuerdo que él llega tarde casi todos los días, así que ya se imaginan qué tan en serio hay que tomar lo que va a decir."],
  ["envenenarpozo","No hace falta que oigan al otro candidato: todos saben que es una persona conflictiva, así que cualquier cosa que proponga hoy seguramente es mentira."],
  ["envenenarpozo","Antes de que el vendedor explique el producto, les cuento que a esa empresa ya la han demandado varias veces, así que no crean nada de lo que diga."],
  ["autoridad","Ese jugador de fútbol dijo en una entrevista que la Tierra tiene solo seis mil años, así que debe ser cierto."],
  ["autoridad","Mi tío, que es ingeniero civil, asegura que ese suplemento para dormir es buenísimo; por eso ya lo pedí por internet."],
  ["autoridad","Ese actor famoso recomendó esa dieta en Instagram, entonces tiene que funcionar."],
  ["popularidad","Todo el salón está copiando en el examen, entonces no puede estar tan mal hacerlo."],
  ["popularidad","Ese celular es el que más se vende en el país, por lo tanto es el mejor que existe."],
  ["popularidad","Casi todos mis amigos creen en ese amuleto de la suerte, así que debe funcionar de verdad."],
  ["emocion","Profesor, si me pone esa nota mis papás me van a castigar todo el semestre y no voy a poder salir con mis amigos nunca más."],
  ["emocion","Piensen en todos los animalitos que sufren, por eso deben firmar esta petición sin siquiera leerla."],
  ["emocion","Si no me prestas tu tarea, voy a quedar tan mal que se va a arruinar todo mi semestre."],
  ["falsacausa","Desde que ese equipo cambió de técnico ha perdido tres partidos seguidos; el problema es claramente el nuevo técnico."],
  ["falsacausa","El día que usé mi lapicero de la buena suerte saqué la mejor nota del semestre: tiene que ser el lapicero."],
  ["falsacausa","Desde que abrieron el nuevo centro comercial ha llovido más en la ciudad; el centro comercial cambió el clima."],
  ["generalizacion","Los dos taxistas que me atendieron esta semana fueron groseros, así que todos los taxistas de la ciudad son así."],
  ["generalizacion","Conocí a dos personas de esa ciudad en un viaje y las dos fueron antipáticas: la gente de allá debe ser así de antipática en general."],
  ["generalizacion","Los tres videos que vi de ese canal eran falsos, entonces ese canal miente en todo lo que publica."],
  ["ignorancia","Nadie ha podido probar que los fantasmas no existen, así que deben existir."],
  ["ignorancia","Como nadie ha demostrado que ese remedio casero no cure el cáncer, es válido pensar que sí lo cura."],
  ["ignorancia","No hay ninguna prueba de que los extraterrestres no nos visiten en las noches, por lo tanto es probable que lo hagan."],
  ["falsodilema","En el trabajo en grupo, o hacemos todo exactamente como yo digo, o no lo entregamos a tiempo."],
  ["falsodilema","O estudias medicina o vas a fracasar en la vida."],
  ["falsodilema","En este debate, o dejamos usar el celular sin ninguna restricción en clase, o hay que prohibirlo por completo."],
  ["pendiente","Si te dejan llegar cinco minutos tarde hoy, mañana van a querer llegar una hora tarde, y en un mes nadie va a venir a clase."],
  ["pendiente","Si les permitimos usar calculadora en este examen, después van a querer usarla en todos, y al final nadie va a aprender a sumar."],
  ["pendiente","Dejar que el colegio cambie el color del uniforme parece inofensivo, pero en una semana van a querer venir en pijama, y en un mes cualquier cosa va a valer."],
  ["peticion","Sé que este horóscopo es confiable porque lo dice el propio horóscopo en su introducción."],
  ["peticion","Yo nunca me equivoco, así que si digo algo es porque es cierto."],
  ["peticion","La contraportada del libro asegura que es una obra maestra, y como el libro mismo lo dice, debe serlo."]
];
