// Regenerate the editable BPMN 2.0 model: node build-daily-report-bpmn.mjs
// No runtime dependency is required. The XML is intentionally non-executable.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const output = fileURLToPath(new URL('./daily-report-review.bpmn', import.meta.url));
const escapeXml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

const lanes = [
  { id: 'Lane_System', name: 'Hệ thống', y: 70, h: 300 },
  { id: 'Lane_Member', name: 'Thành viên', y: 370, h: 170 },
  { id: 'Lane_Reviewer', name: 'Người duyệt', y: 540, h: 170 },
];

const nodes = [
  { id: 'Start_Ready', type: 'startEvent', name: 'Bản đã sẵn sàng', lane: 'Lane_Member', x: 130, y: 437, w: 36, h: 36 },
  { id: 'Task_Edit', type: 'userTask', name: 'Rà soát, sửa nội dung', lane: 'Lane_Member', x: 210, y: 415, w: 150, h: 80 },
  { id: 'Task_Submit', type: 'userTask', name: 'Nộp báo cáo', lane: 'Lane_Member', x: 410, y: 415, w: 120, h: 80 },
  { id: 'Task_Validate', type: 'serviceTask', name: 'Kiểm tra quyền, nội dung và giờ khóa', lane: 'Lane_System', x: 580, y: 130, w: 150, h: 80 },
  { id: 'Gateway_Valid', type: 'exclusiveGateway', name: 'Hợp lệ?', lane: 'Lane_System', x: 790, y: 145, w: 50, h: 50 },
  { id: 'Task_Error', type: 'userTask', name: 'Xem lý do và sửa', lane: 'Lane_Member', x: 780, y: 415, w: 140, h: 80 },
  { id: 'Task_Persist', type: 'serviceTask', name: 'Lưu revision và chốt hạn duyệt', lane: 'Lane_System', x: 900, y: 130, w: 160, h: 80 },
  { id: 'Task_Review', type: 'userTask', name: 'Đọc và kết luận', lane: 'Lane_Reviewer', x: 1120, y: 585, w: 160, h: 80 },
  { id: 'Event_ReviewExpired', type: 'boundaryEvent', name: 'Hết hạn duyệt', lane: 'Lane_Reviewer', x: 1244, y: 647, w: 36, h: 36, attrs: 'attachedToRef="Task_Review" cancelActivity="true"', extra: '<bpmn:timerEventDefinition id="Timer_ReviewDeadline"><bpmn:timeDate xsi:type="bpmn:tFormalExpression">${reviewDeadlineAt}</bpmn:timeDate></bpmn:timerEventDefinition>' },
  { id: 'Gateway_Decision', type: 'exclusiveGateway', name: 'Kết luận?', lane: 'Lane_Reviewer', x: 1350, y: 600, w: 50, h: 50 },
  { id: 'End_Accepted', type: 'endEvent', name: 'Đạt', lane: 'Lane_Reviewer', x: 1500, y: 607, w: 36, h: 36 },
  { id: 'Task_Carry', type: 'serviceTask', name: 'Tạo hoặc xác nhận việc chuyển tiếp', lane: 'Lane_System', x: 1470, y: 110, w: 170, h: 80 },
  { id: 'End_Continued', type: 'endEvent', name: 'Tiếp tục thực hiện', lane: 'Lane_System', x: 1740, y: 132, w: 36, h: 36 },
  { id: 'Task_Reopen', type: 'serviceTask', name: 'Mở cửa sổ sửa và gửi lý do', lane: 'Lane_System', x: 1470, y: 280, w: 170, h: 80 },
  { id: 'Task_Revise', type: 'userTask', name: 'Sửa theo yêu cầu', lane: 'Lane_Member', x: 1690, y: 415, w: 150, h: 80 },
  { id: 'Task_Expire', type: 'serviceTask', name: 'Ghi nhận quá hạn duyệt', lane: 'Lane_System', x: 1470, y: 200, w: 170, h: 70 },
  { id: 'End_Expired', type: 'endEvent', name: 'Chưa có kết luận', lane: 'Lane_System', x: 1740, y: 217, w: 36, h: 36 },
];

const flows = [
  { id: 'Flow_Ready_Edit', from: 'Start_Ready', to: 'Task_Edit', xy: [[166,455],[210,455]] },
  { id: 'Flow_Edit_Submit', from: 'Task_Edit', to: 'Task_Submit', xy: [[360,455],[410,455]] },
  { id: 'Flow_Submit_Validate', from: 'Task_Submit', to: 'Task_Validate', xy: [[530,455],[550,455],[550,170],[580,170]] },
  { id: 'Flow_Validate_Gateway', from: 'Task_Validate', to: 'Gateway_Valid', xy: [[730,170],[790,170]] },
  { id: 'Flow_Invalid', from: 'Gateway_Valid', to: 'Task_Error', name: 'Không hợp lệ', condition: 'invalid', xy: [[815,195],[815,415]] },
  { id: 'Flow_Error_Edit', from: 'Task_Error', to: 'Task_Edit', xy: [[780,455],[750,455],[750,520],[185,520],[185,455],[210,455]] },
  { id: 'Flow_Valid', from: 'Gateway_Valid', to: 'Task_Persist', name: 'Hợp lệ', condition: 'valid', xy: [[840,170],[900,170]] },
  { id: 'Flow_Persist_Review', from: 'Task_Persist', to: 'Task_Review', xy: [[1060,170],[1090,170],[1090,625],[1120,625]] },
  { id: 'Flow_Review_Decision', from: 'Task_Review', to: 'Gateway_Decision', xy: [[1280,625],[1350,625]] },
  { id: 'Flow_Accepted', from: 'Gateway_Decision', to: 'End_Accepted', name: 'Đạt', condition: 'ACCEPTED', xy: [[1400,625],[1500,625]] },
  { id: 'Flow_Continued', from: 'Gateway_Decision', to: 'Task_Carry', name: 'Tiếp tục', condition: 'CONTINUED', xy: [[1375,600],[1375,150],[1470,150]] },
  { id: 'Flow_Carry_End', from: 'Task_Carry', to: 'End_Continued', xy: [[1640,150],[1740,150]] },
  { id: 'Flow_Rejected', from: 'Gateway_Decision', to: 'Task_Reopen', name: 'Chưa đạt', condition: 'REJECTED', xy: [[1375,650],[1375,320],[1470,320]] },
  { id: 'Flow_Reopen_Revise', from: 'Task_Reopen', to: 'Task_Revise', xy: [[1640,320],[1660,320],[1660,455],[1690,455]] },
  { id: 'Flow_Revise_Submit', from: 'Task_Revise', to: 'Task_Submit', xy: [[1840,455],[1870,455],[1870,735],[385,735],[385,455],[410,455]] },
  { id: 'Flow_Expired', from: 'Event_ReviewExpired', to: 'Task_Expire', xy: [[1280,665],[1420,665],[1420,235],[1470,235]] },
  { id: 'Flow_Expire_End', from: 'Task_Expire', to: 'End_Expired', xy: [[1640,235],[1740,235]] },
];

const line = (s) => `    ${s}`;
const incoming = (id) => flows.filter((f) => f.to === id).map((f) => line(`<bpmn:incoming>${f.id}</bpmn:incoming>`)).join('\n');
const outgoing = (id) => flows.filter((f) => f.from === id).map((f) => line(`<bpmn:outgoing>${f.id}</bpmn:outgoing>`)).join('\n');
const nodeXml = (n) => {
  const attrs = n.attrs ? ` ${n.attrs}` : '';
  const refs = [incoming(n.id), outgoing(n.id), n.extra ? line(n.extra) : ''].filter(Boolean).join('\n');
  return `  <bpmn:${n.type} id="${n.id}" name="${escapeXml(n.name)}"${attrs}>\n${refs}\n  </bpmn:${n.type}>`;
};
const flowXml = (f) => {
  const expr = f.condition ? `\n    <bpmn:conditionExpression xsi:type="bpmn:tFormalExpression">${escapeXml(f.condition)}</bpmn:conditionExpression>` : '';
  return `  <bpmn:sequenceFlow id="${f.id}" sourceRef="${f.from}" targetRef="${f.to}"${f.name ? ` name="${escapeXml(f.name)}"` : ''}>${expr}\n  </bpmn:sequenceFlow>`;
};

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" xmlns:di="http://www.omg.org/spec/DD/20100524/DI" id="Definitions_DailyReport" targetNamespace="https://acta.vn/model/daily-report">
 <bpmn:process id="Process_ReportReview" name="Nộp và duyệt một báo cáo ngày" isExecutable="false">
  <bpmn:laneSet id="LaneSet_ReportReview">
${lanes.map((lane) => `   <bpmn:lane id="${lane.id}" name="${escapeXml(lane.name)}">\n${nodes.filter((n) => n.lane === lane.id).map((n) => `    <bpmn:flowNodeRef>${n.id}</bpmn:flowNodeRef>`).join('\n')}\n   </bpmn:lane>`).join('\n')}
  </bpmn:laneSet>
${nodes.map(nodeXml).join('\n')}
${flows.map(flowXml).join('\n')}
 </bpmn:process>
 <bpmn:collaboration id="Collaboration_ReportReview">
  <bpmn:participant id="Participant_ACTA" name="ACTA Social" processRef="Process_ReportReview" />
 </bpmn:collaboration>
 <bpmndi:BPMNDiagram id="Diagram_ReportReview">
  <bpmndi:BPMNPlane id="Plane_ReportReview" bpmnElement="Collaboration_ReportReview">
   <bpmndi:BPMNShape id="Shape_Participant_ACTA" bpmnElement="Participant_ACTA" isHorizontal="true"><dc:Bounds x="40" y="70" width="1900" height="640" /></bpmndi:BPMNShape>
${lanes.map((lane) => `   <bpmndi:BPMNShape id="Shape_${lane.id}" bpmnElement="${lane.id}" isHorizontal="true"><dc:Bounds x="70" y="${lane.y}" width="1870" height="${lane.h}" /></bpmndi:BPMNShape>`).join('\n')}
${nodes.map((n) => `   <bpmndi:BPMNShape id="Shape_${n.id}" bpmnElement="${n.id}"><dc:Bounds x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" /></bpmndi:BPMNShape>`).join('\n')}
${flows.map((f) => `   <bpmndi:BPMNEdge id="Edge_${f.id}" bpmnElement="${f.id}">${f.xy.map(([x,y]) => `<di:waypoint x="${x}" y="${y}" />`).join('')}</bpmndi:BPMNEdge>`).join('\n')}
  </bpmndi:BPMNPlane>
 </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;

// Structural guards for manual edits to the generator.
const ids = new Set(nodes.map((n) => n.id));
for (const f of flows) {
  if (!ids.has(f.from) || !ids.has(f.to)) throw new Error(`Broken flow: ${f.id}`);
  if (f.xy.length < 2) throw new Error(`Missing waypoints: ${f.id}`);
}
for (const n of nodes) if (!lanes.some((lane) => lane.id === n.lane)) throw new Error(`Missing lane: ${n.id}`);
writeFileSync(output, xml, 'utf8');
console.log(output);
