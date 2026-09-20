// Regenerate: node build-task-bpmn.mjs
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const out = fileURLToPath(new URL('./task-create-assign.bpmn', import.meta.url));
const esc = s => String(s).replaceAll('&','&amp;').replaceAll('"','&quot;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const lanes = [
  { id:'Lane_Creator', name:'Người tạo việc', y:70, h:170 },
  { id:'Lane_System', name:'Hệ thống', y:240, h:170 },
  { id:'Lane_Assignee', name:'Người liên quan', y:410, h:170 },
];
const nodes = [
  ['Start_Need','startEvent','Có nhu cầu giao việc','Lane_Creator',120,132,36,36],
  ['Task_Enter','userTask','Nhập thông tin và người liên quan','Lane_Creator',210,110,170,80],
  ['Task_Validate','serviceTask','Kiểm tra dữ liệu và quyền','Lane_System',440,280,150,80],
  ['Gateway_Valid','exclusiveGateway','Hợp lệ?','Lane_System',650,295,50,50],
  ['Task_Correct','userTask','Xem lỗi và sửa','Lane_Creator',650,110,140,80],
  ['Task_Create','serviceTask','Tạo công việc','Lane_System',770,280,150,80],
  ['Gateway_Assigned','exclusiveGateway','Có người liên quan?','Lane_System',980,295,50,50],
  ['End_Unassigned','endEvent','Đã tạo việc','Lane_System',1060,245,36,36],
  ['Task_Invite','serviceTask','Gửi lời mời tham gia','Lane_System',1120,280,160,80],
  ['Task_Accept','userTask','Xem và nhận tham gia','Lane_Assignee',1350,455,160,80],
  ['Task_Record','serviceTask','Ghi nhận đã tham gia','Lane_System',1570,280,160,80],
  ['End_Assigned','endEvent','Đã nhận tham gia','Lane_System',1800,302,36,36],
].map(([id,type,name,lane,x,y,w,h])=>({id,type,name,lane,x,y,w,h}));
const flows = [
  ['F1','Start_Need','Task_Enter',[[156,150],[210,150]]],
  ['F2','Task_Enter','Task_Validate',[[380,150],[410,150],[410,320],[440,320]]],
  ['F3','Task_Validate','Gateway_Valid',[[590,320],[650,320]]],
  ['F4','Gateway_Valid','Task_Create',[[700,320],[770,320]],'Có','valid'],
  ['F5','Gateway_Valid','Task_Correct',[[675,295],[675,190]],'Không','invalid'],
  ['F6','Task_Correct','Task_Enter',[[650,150],[610,150],[610,220],[185,220],[185,150],[210,150]]],
  ['F7','Task_Create','Gateway_Assigned',[[920,320],[980,320]]],
  ['F8','Gateway_Assigned','End_Unassigned',[[1005,295],[1005,263],[1060,263]],'Không','none'],
  ['F9','Gateway_Assigned','Task_Invite',[[1030,320],[1120,320]],'Có','some'],
  ['F10','Task_Invite','Task_Accept',[[1280,320],[1320,320],[1320,495],[1350,495]]],
  ['F11','Task_Accept','Task_Record',[[1510,495],[1540,495],[1540,320],[1570,320]]],
  ['F12','Task_Record','End_Assigned',[[1730,320],[1800,320]]],
].map(([id,from,to,xy,name,condition])=>({id,from,to,xy,name,condition}));
const ids = new Set(nodes.map(n=>n.id));
for(const f of flows) if(!ids.has(f.from)||!ids.has(f.to)) throw new Error(`Broken flow ${f.id}`);
const refs=(id,side)=>flows.filter(f=>f[side]===id).map(f=>`   <bpmn:${side==='to'?'incoming':'outgoing'}>${f.id}</bpmn:${side==='to'?'incoming':'outgoing'}>`).join('\n');
const nodeXml=n=>`  <bpmn:${n.type} id="${n.id}" name="${esc(n.name)}">\n${refs(n.id,'to')}\n${refs(n.id,'from')}\n  </bpmn:${n.type}>`;
const flowXml=f=>`  <bpmn:sequenceFlow id="${f.id}" sourceRef="${f.from}" targetRef="${f.to}"${f.name?` name="${esc(f.name)}"`:''}>${f.condition?`\n   <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${esc(f.condition)}</bpmn:conditionExpression>`:''}\n  </bpmn:sequenceFlow>`;
const xml=`<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_Task" targetNamespace="https://acta.vn/model/task">
 <bpmn:process id="Process_TaskCreate" name="Tạo và giao công việc" isExecutable="false">
  <bpmn:laneSet id="LaneSet_Task">
${lanes.map(l=>`   <bpmn:lane id="${l.id}" name="${esc(l.name)}">${nodes.filter(n=>n.lane===l.id).map(n=>`<bpmn:flowNodeRef>${n.id}</bpmn:flowNodeRef>`).join('')}</bpmn:lane>`).join('\n')}
  </bpmn:laneSet>
${nodes.map(nodeXml).join('\n')}
${flows.map(flowXml).join('\n')}
 </bpmn:process>
 <bpmn:collaboration id="Collaboration_Task"><bpmn:participant id="Participant_ACTA_Task" name="ACTA Social" processRef="Process_TaskCreate" /></bpmn:collaboration>
 <bpmndi:BPMNDiagram id="Diagram_Task"><bpmndi:BPMNPlane id="Plane_Task" bpmnElement="Collaboration_Task">
  <bpmndi:BPMNShape id="Shape_Participant_ACTA_Task" bpmnElement="Participant_ACTA_Task" isHorizontal="true"><dc:Bounds x="40" y="70" width="1870" height="510" /></bpmndi:BPMNShape>
${lanes.map(l=>`  <bpmndi:BPMNShape id="Shape_${l.id}" bpmnElement="${l.id}" isHorizontal="true"><dc:Bounds x="70" y="${l.y}" width="1840" height="${l.h}" /></bpmndi:BPMNShape>`).join('\n')}
${nodes.map(n=>`  <bpmndi:BPMNShape id="Shape_${n.id}" bpmnElement="${n.id}"><dc:Bounds x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" /></bpmndi:BPMNShape>`).join('\n')}
${flows.map(f=>`  <bpmndi:BPMNEdge id="Edge_${f.id}" bpmnElement="${f.id}">${f.xy.map(([x,y])=>`<di:waypoint x="${x}" y="${y}" />`).join('')}</bpmndi:BPMNEdge>`).join('\n')}
 </bpmndi:BPMNPlane></bpmndi:BPMNDiagram>
</bpmn:definitions>
`;
writeFileSync(out,xml,'utf8');
console.log(out);
