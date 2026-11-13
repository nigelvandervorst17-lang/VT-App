/* Basic RT PRO 2.3 — context-only reference data from user-supplied documents.
 * Research and lookup aids, NEVER merged into exposure calculation engine.
 */
export const densityAchieved=[0.5,0.75,1,1.5,2,2.5,3,3.5,4];
export const densityRequired=[1.5,2,2.5,3,3.5,4];
// Rows = achieved density; columns = target density, literal from 'Bereikte Zwarting(1).doc'.
export const densityFactors=[
 [2.8,3.9,5.1,5.9,6.8,7.4],
 [1.9,2.7,3.4,3.8,4.5,5.0],
 [1.5,2.1,2.6,3.0,3.5,4.0],
 [1.0,1.4,1.7,2.0,2.3,2.6],
 [0.7,1.0,1.25,1.4,1.7,1.9],
 [0.6,0.8,1.0,1.1,1.3,1.5],
 [0.5,0.7,0.9,1.0,1.2,1.3],
 [0.4,0.6,0.7,0.9,1.0,1.1],
 [0.38,0.52,0.66,0.8,0.9,1.0],
];
// AGFA STRUCTURIX brochure, PDF page 3, table A (automatic processing).
// Class is film SYSTEM class under the stated processing conditions, not a bare film certificate.
export const filmSystems=[
 {type:'D2',iso:'C1',speed:32},
 {type:'D3',iso:'C2',speed:64},
 {type:'D4',iso:'C3',speed:100},
 {type:'D5',iso:'C4',speed:200},
 {type:'D7',iso:'C5',speed:320},
 {type:'D8',iso:'C6',speed:400},
];
export const exposureDiagrams=[
 {id:'smart-225b',name:'ANDREX SMART 225 · D5 (225b-bestand)',film:'D5',screen:'0,027 mm Pb',distance:'80 cm',density:'2,5',file:'./assets/smart-225b.webp',note:'100–225 kV · grafiek in mA·min'},
 {id:'smart-225-d7',name:'SMART 225 · D7',film:'D7',screen:'Pb',distance:'70 cm',density:'2,0',file:'./assets/smart-225-d7.webp',note:'70–225 kV · fabrikantgrafiek, scan'},
 {id:'smart-200pc-d7',name:'SMART 200PC · D7',film:'D7',screen:'Pb',distance:'70 cm',density:'2,0',file:'./assets/smart-200pc-d7.webp',note:'80–200 kV · fabrikantgrafiek, scan'},
 {id:'yxlon-160',name:"YXLON Y.SMART 160E/0.4 / 160E/1.5 / 160W exposure diagram (user-provided PNG)",film:'D7',screen:'Pb',distance:'70 cm',density:'2,0',file:"./assets/smart-160-d7.webp",note:"Door pixels ingelezen, niet gevalideerde grafiek; alleen voor privétest"},
 {id:'yxlon-200',name:"YXLON Y.SMART 200 / 200W exposure diagram (user-provided PNG)",film:'D7',screen:'Pb',distance:'70 cm',density:'2,0',file:"./assets/smart-200-d7.webp",note:"Door pixels ingelezen, niet gevalideerde grafiek; alleen voor privétest"},
 {id:'yxlon-200pc',name:"YXLON Y.SMART 200PC exposure diagram (user-provided PNG)",film:'D7',screen:'Pb',distance:'70 cm',density:'2,0',file:"./assets/smart-200pc-new-d7.webp",note:"80–200 kV · alleen naslag: schalen inconsistent"},
 {id:'yxlon-225',name:"YXLON Y.SMART 225 / 225X / 225W exposure diagram (user-provided PNG)",film:'D7',screen:'Pb',distance:'70 cm',density:'2,0',file:"./assets/smart-225-yxlon-d7.webp",note:"Door pixels ingelezen, niet gevalideerde grafiek; alleen voor privétest"},
 {id:'yxlon-300hp',name:"YXLON Y.SMART 300HP / 300HPW exposure diagram (user-provided PNG)",film:'D7',screen:'Pb',distance:'70 cm',density:'2,0',file:"./assets/smart-300hp-d7.webp",note:"Door pixels ingelezen, niet gevalideerde grafiek; alleen voor privétest"},
 {id:'yxlon-300pc',name:"YXLON Y.SMART 300PC exposure diagram (user-provided PNG)",film:'D7',screen:'Pb',distance:'70 cm',density:'2,0',file:"./assets/smart-300pc-d7.webp",note:"Door pixels ingelezen, niet gevalideerde grafiek; alleen voor privétest"},

];
// ISO 4063:1998 reference numbers from user-supplied older N.I.L. printout (dated 17-03-2008).
export const weldProcesses=[
 {number:'111',nl:'Booglassen met beklede elektrode',en:'Manual metal arc welding'},
 {number:'121',nl:'Onderpoederlassen met draadelektrode',en:'Submerged arc welding with wire electrode'},
 {number:'131',nl:'MIG-lassen',en:'Metal arc inert gas welding'},
 {number:'135',nl:'MAG-lassen (massieve draad)',en:'Metal active gas welding'},
 {number:'136',nl:'MAG-lassen (gevulde draad)',en:'Flux-cored arc welding with active gas shield'},
 {number:'141',nl:'TIG-lassen',en:'Tungsten inert gas welding'},
];
// Structured wall-thickness lookup from Van Leeuwen ASME B36.10/B36.19 PDF, two pages.
export const pipeSchedules=[{"nps":"1/8","od":10.3,"wall":{"10S":1.24,"10":1.24,"30":1.45,"40S/STD":1.73,"40":1.73,"80S/XS":2.41,"80":2.41,"160":3.15,"XXS":4.83}},{"nps":"1/4","od":13.7,"wall":{"10S":1.65,"10":1.65,"30":1.85,"40S/STD":2.24,"40":2.24,"80S/XS":3.02,"80":3.02,"160":3.68,"XXS":6.05}},{"nps":"3/8","od":17.1,"wall":{"10S":1.65,"10":1.65,"30":1.85,"40S/STD":2.31,"40":2.31,"80S/XS":3.2,"80":3.2,"160":4.01,"XXS":6.4}},{"nps":"1/2","od":21.3,"wall":{"5S/5":1.65,"10S":2.11,"10":2.11,"30":2.41,"40S/STD":2.77,"40":2.77,"80S/XS":3.73,"80":3.73,"160":4.78,"XXS":7.47}},{"nps":"3/4","od":26.7,"wall":{"5S/5":1.65,"10S":2.11,"10":2.11,"30":2.41,"40S/STD":2.87,"40":2.87,"80S/XS":3.91,"80":3.91,"160":5.56,"XXS":7.82}},{"nps":"1","od":33.4,"wall":{"5S/5":1.65,"10S":2.77,"10":2.77,"30":2.9,"40S/STD":3.38,"40":3.38,"80S/XS":4.55,"80":4.55,"160":6.35,"XXS":9.09}},{"nps":"1 1/4","od":42.2,"wall":{"5S/5":1.65,"10S":2.77,"10":2.77,"30":2.97,"40S/STD":3.56,"40":3.56,"80S/XS":4.85,"80":4.85,"160":6.35,"XXS":9.7}},{"nps":"1 1/2","od":48.3,"wall":{"5S/5":1.65,"10S":2.77,"10":2.77,"30":3.18,"40S/STD":3.68,"40":3.68,"80S/XS":5.08,"80":5.08,"160":7.14,"XXS":10.15}},{"nps":"2","od":60.3,"wall":{"5S/5":1.65,"10S":2.77,"10":2.77,"30":3.18,"40S/STD":3.91,"40":3.91,"80S/XS":5.54,"80":5.54,"160":8.74,"XXS":11.07}},{"nps":"2 1/2","od":73.0,"wall":{"5S/5":2.11,"10S":3.05,"10":3.05,"30":4.78,"40S/STD":5.16,"40":5.16,"80S/XS":7.01,"80":7.01,"160":9.53,"XXS":14.02}},{"nps":"3","od":88.9,"wall":{"5S/5":2.11,"10S":3.05,"10":3.05,"30":4.78,"40S/STD":5.49,"40":5.49,"80S/XS":7.62,"80":7.62,"160":11.13,"XXS":15.24}},{"nps":"3 1/2","od":101.6,"wall":{"5S/5":2.11,"10S":3.05,"10":3.05,"30":4.78,"40S/STD":5.74,"40":5.74,"80S/XS":8.08,"80":8.08}},{"nps":"4","od":114.3,"wall":{"5S/5":2.11,"10S":3.05,"10":3.05,"30":4.78,"40S/STD":6.02,"40":6.02,"80S/XS":8.56,"80":8.56,"120":11.13,"160":13.49,"XXS":17.12}},{"nps":"5","od":141.3,"wall":{"5S/5":2.77,"10S":3.4,"10":3.4,"40S/STD":6.55,"40":6.55,"80S/XS":9.53,"80":9.53,"120":12.7,"160":15.88,"XXS":19.05}},{"nps":"6","od":168.3,"wall":{"5S/5":2.77,"10S":3.4,"10":3.4,"40S/STD":7.11,"40":7.11,"80S/XS":10.97,"80":10.97,"120":14.27,"160":18.26,"XXS":21.95}},{"nps":"8","od":219.1,"wall":{"5S/5":2.77,"10S":3.76,"10":3.76,"20":6.35,"30":7.04,"40S/STD":8.18,"40":8.18,"60":10.31,"80S/XS":12.7,"80":12.7,"100":15.09,"120":18.26,"140":20.62,"160":23.01,"XXS":22.23}},{"nps":"10","od":273.0,"wall":{"5S/5":3.4,"10S":4.19,"10":4.19,"20":6.35,"30":7.8,"40S/STD":9.27,"40":9.27,"60":12.7,"80S/XS":12.7,"80":15.09,"100":18.26,"120":21.44,"140":25.4,"160":28.58,"XXS":25.4}},{"nps":"12","od":323.9,"wall":{"5S/5":3.96,"10S":4.57,"10":4.57,"20":6.35,"30":8.38,"40S/STD":9.53,"40":10.31,"60":14.27,"80S/XS":12.7,"80":17.48,"100":21.44,"120":25.4,"140":28.58,"160":33.32,"XXS":25.4}},{"nps":"14","od":355.6,"wall":{"5S/5":3.96,"10S":4.78,"10":6.35,"20":7.92,"30":9.53,"40S/STD":9.53,"40":11.13,"60":15.09,"80S/XS":12.7,"80":19.05,"100":23.83,"120":27.79,"140":31.75,"160":35.71}},{"nps":"16","od":406.4,"wall":{"5S/5":4.19,"10S":4.78,"10":6.35,"20":7.92,"30":9.53,"40S/STD":9.53,"40":12.7,"60":16.66,"80S/XS":12.7,"80":21.44,"100":26.19,"120":30.96,"140":36.53,"160":40.49}},{"nps":"18","od":457.0,"wall":{"5S/5":4.19,"10S":4.78,"10":6.35,"20":7.92,"30":11.13,"40S/STD":9.53,"40":14.27,"60":19.05,"80S/XS":12.7,"80":23.83,"100":29.36,"120":34.93,"140":39.67,"160":45.24}},{"nps":"20","od":508.0,"wall":{"5S/5":4.78,"10S":5.54,"10":6.35,"20":9.53,"30":12.7,"40S/STD":9.53,"40":15.09,"60":20.62,"80S/XS":12.7,"80":26.19,"100":32.54,"120":38.1,"140":44.45,"160":50.01}},{"nps":"22","od":559.0,"wall":{"5S/5":4.78,"10S":5.54,"10":6.35,"20":9.53,"30":12.7,"40S/STD":9.53,"60":22.23,"80S/XS":12.7,"80":28.58,"100":34.93,"120":41.28,"140":47.63,"160":53.98}},{"nps":"24","od":610.0,"wall":{"5S/5":5.54,"10S":6.35,"10":6.35,"20":9.53,"30":14.27,"40S/STD":9.53,"40":17.48,"60":24.61,"80S/XS":12.7,"80":30.96,"100":38.89,"120":46.02,"140":52.37,"160":59.54}},{"nps":"26","od":660.0,"wall":{"10":7.92,"20":12.7,"40S/STD":9.53,"80S/XS":12.7}},{"nps":"28","od":711.0,"wall":{"10":7.92,"20":12.7,"30":15.88,"40S/STD":9.53,"80S/XS":12.7}},{"nps":"30","od":762.0,"wall":{"5S/5":6.35,"10S":7.92,"10":7.92,"20":12.7,"30":15.88,"40S/STD":9.53,"80S/XS":12.7}},{"nps":"32","od":813.0,"wall":{"10":7.92,"20":12.7,"30":15.88,"40S/STD":9.53,"40":17.48,"80S/XS":12.7}},{"nps":"34","od":864.0,"wall":{"10":7.92,"20":12.7,"30":15.88,"40S/STD":9.53,"40":17.48,"80S/XS":12.7}},{"nps":"36","od":914.0,"wall":{"10":7.92,"20":12.7,"30":15.88,"40S/STD":9.53,"40":19.05,"80S/XS":12.7}},{"nps":"38","od":965.0,"wall":{"40S/STD":9.53,"80S/XS":12.7}},{"nps":"40","od":1016.0,"wall":{"40S/STD":9.53,"80S/XS":12.7}},{"nps":"42","od":1067.0,"wall":{"40S/STD":9.53,"80S/XS":12.7}},{"nps":"44","od":1118.0,"wall":{"40S/STD":9.53,"80S/XS":12.7}},{"nps":"46","od":1168.0,"wall":{"40S/STD":9.53,"80S/XS":12.7}},{"nps":"48","od":1219.0,"wall":{"40S/STD":9.53,"80S/XS":12.7}}];
