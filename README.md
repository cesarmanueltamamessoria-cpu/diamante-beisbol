# DIAMANTE — Simulador de carrera de béisbol

Versión beisbolera de [Copero](https://copero.com.ar/): creás un pelotero de 16 años, elegís de
dónde viene y qué posición juega, y la carrera entera se simula temporada a temporada hasta el
retiro y la votación al Salón de la Fama.

Todo corre en el navegador. Sin registro, sin backend, sin dependencias externas.

## Cómo se abre

Doble clic en `index.html`. Nada más.

Si preferís servirlo por HTTP (por ejemplo para probarlo desde el móvil en la misma red):

```bash
node serve.js
```

## Qué hay dentro

| Archivo | Qué contiene |
|---|---|
| `index.html` | Las cuatro pantallas: inicio, creación, carrera y legado |
| `css/styles.css` | Todo el diseño; sin frameworks |
| `js/data.js` | 95 franquicias reales de 15 ligas, 50 países, 11 posiciones, premios |
| `js/engine.js` | Motor: generación de estadísticas, premios, desarrollo, lesiones, valor de mercado, retiro y valoración final |
| `js/events.js` | Las decisiones: arranque profesional según el país, fichajes, ascensos, cambios de posición, escándalos, despedida |
| `js/card.js` | Tarjeta de legado dibujada en canvas y resumen de texto |
| `js/app.js` | Interfaz y bucle de juego |

## Cómo funciona la simulación

**Creación.** El jugador nace a los 16 años con seis atributos (o cinco, si es lanzador) sorteados
alrededor de la calidad del semillero de su país. El OVR sale de esos atributos ponderados según la
posición: a un campocorto le pesa la defensa, a un designado solo le pesa el bate. El **techo es
oculto** y solo se descubre jugando.

**Ruta de entrada.** Cada país entra al profesionalismo por su puerta: draft (EE. UU., Puerto Rico,
Canadá), academia internacional (Caribe), Serie Nacional o salida de la isla (Cuba), draft local
(Japón, Corea, Taiwán), Liga Mexicana, o tryout abierto para el resto del mundo.

**Temporada.** Se calcula el tiempo de juego según el OVR frente a la barra de calidad de la liga,
se generan las estadísticas de la posición (AVG/HR/CI/OPS/WAR o EFE/ponches/salvados/WAR), se
resuelve la postemporada del club, se reparten premios por probabilidad según lo hecho, se tira por
lesión y se aplica la curva de desarrollo: se crece hasta los 24, se madura hasta los 30 y se cae
después, con la velocidad yéndose primero.

**Decisiones.** Cada una, dos o tres temporadas —según el ritmo elegido— la simulación se detiene.
Además hay paradas obligatorias cuando se acaba el contrato o llega una lesión grave.

**Final.** La valoración pondera cada temporada por el nivel de la liga (lo hecho en Grandes Ligas
vale entero; lo de ligas menores, una fracción) y por la exigencia de la posición. De ahí salen el
escalafón —de *Promesa trunca* a *Inmortal*—, el porcentaje de votos al Salón de la Fama y la
tarjeta descargable.

## Calibrado

Sobre 700 carreras simuladas eligiendo países con tradición beisbolera:

- 13,2 temporadas de media, 44 % llega a Grandes Ligas, 24 % aguanta diez años arriba
- 5 % entra al Salón de la Fama
- Escalafón: 14 % promesa trunca · 35 % profesional · 21 % titular · 11 % todo estrella ·
  7 % superestrella · 7 % ícono · 3 % leyenda · 1 % inmortal

El banco de pruebas vive fuera del repositorio; el motor se puede cargar en Node sin navegador
(`data.js`, `engine.js` y `events.js` solo necesitan un objeto `window`).

## Aviso

Proyecto de ficción y entretenimiento. Los nombres de clubes y ligas son referencias reales usadas
de forma descriptiva; no hay asociación ni autorización de ninguna de esas entidades.
