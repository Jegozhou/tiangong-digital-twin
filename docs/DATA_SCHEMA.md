# Component data contract (for src/data/)

Deliver these files only:
- `src/data/references.js`
- `src/data/components.js`
- `docs/RESEARCH.md` (short research notes and source list)
Do not create other JS/UI/CSS files.

## references.js
```js
export const REFERENCES = {
  'CMSE-CSS': {
    id: 'CMSE-CSS',
    title: '中国空间站研制和建造',
    publisher: '中国载人航天工程网',
    year: '2023',
    type: 'official', // official | academic | media | reference
    url: 'https://www.cmse.gov.cn/...'
  }
};
export const SOURCE_GROUPS = [ ... optional ... ];
```
Use only sources supplied by the task owner or well-known public official publications. If a URL cannot be verified from this environment, still record the official URL supplied in the brief, and in RESEARCH.md note "依据公开资料整理，链接由项目资料提供". Do not invent article IDs or titles. Known supplied links:
- https://www.cmse.gov.cn/
- https://www.cnsa.gov.cn/
- https://www.cnsa.gov.cn/n6758823/n6758838/c10087703/content.html
- https://www.cmse.gov.cn/hdjl/bszjhd/bjzl/202301/t20230117_52275.html
- https://www.cmse.gov.cn/xwzx/202211/t20221107_51357.html
You may add clearly generic official landing pages (e.g. 中国载人航天工程网 官方发布) but no fabricated deep links.

## components.js
Export exactly:
```js
export const ACCURACY_LEVELS = {
  A: { key:'A', label:'官方参数', short:'官方', description:'公开官方资料可确认的尺寸、构型或功能。' },
  B: { ... label:'公开资料近似', ... },
  C: { ... label:'科普示意', ... },
  D: { ... label:'动画模拟', ... }
};

export const COMPONENTS = {
  'station': { ... },
  'tianhe': { ... },
  // etc
};

export const STRUCTURE_TREE = [
  { id:'station-root', name:'空间站总览', icon:'station', selectableId:'station', children:[
    { id:'tianhe-group', name:'天和核心舱', selectableId:'tianhe', children:[
      { id:'...', name:'节点舱', selectableId:'tianhe-node' }, ...
    ]},
  ]},
  { id:'systems-group', name:'公共工程系统', icon:'systems', children:[
    { id:'sys-power', name:'能源与配电', selectableId:'system-power' }, ...
  ]},
  { id:'visiting-group', name:'停靠航天器', icon:'craft', children:[
    { id:'shenzhou', name:'神舟载人飞船', selectableId:'shenzhou' }, ...
  ]}
];
export const SYSTEM_VIEWS = {
  power: { id:'power', name:'能源', englishName:'POWER', color:'#FFD166', description:'太阳翼—驱动机构—能源传输路径的概念高亮。', componentIds:[...] },
  // comm, thermal, docking, arm
};
export const OVERVIEW_STATS = [ {value:'3', unit:'舱段', label:'T 字基本构型'}, ... ];
export const TIMELINE_STAGES = [
  { index:0, date:'2021.04.29', title:'天和核心舱入轨', description:'...', accuracyLevel:'A', referenceIds:['...'] }, ...
];
export const COMPARISONS = [ { id:'wentian', name:'问天实验舱', ...fields } ]; // optional
export const GLOSSARY = [...] // optional
```

### Required component records and exact IDs
Each record:
```js
{
  id, parentId, name, englishName, shortName,
  category,                 // 舱段 / 功能舱 / 机械臂 / 太阳翼 / 对接口 / 气闸 / 平台 / 系统 / 飞船
  module,                   // 天和 / 问天 / 梦天 / 共享 / 停靠
  selectable: true,
  accuracyLevel: 'A'|'B'|'C'|'D',
  summary,                  // 1 sentence, <= 50 CN chars
  description,              // 2–4 sentences, factual and hedged where needed
  function,                 // 1–3 sentences
  specs: [ {label, value, accuracyLevel?, note?} ],  // only confirmed facts with level A; use 公开资料未确认 where unknown
  structure: [ '...' ],     // 2–5 bullet strings; mark conceptual where relevant
  relations: ['id', ...],
  referenceIds: ['...'],
  tags: ['...'],
  modelDimensions: { x, y, z, unit:'m' } | null   // model bounding box; may be null
}
```
Required IDs (must all exist and map to 3D objects):
- station
- tianhe, tianhe-node, tianhe-living, tianhe-resource, tianhe-front-dock, tianhe-rear-dock, tianhe-radial-dock, tianhe-big-arm, tianhe-solar-a, tianhe-solar-b
- wentian, wentian-berth, wentian-working, wentian-airlock, wentian-resource, wentian-small-arm, wentian-exp-platform, wentian-solar-a, wentian-solar-b
- mengtian, mengtian-berth, mengtian-working, mengtian-cargo-airlock, mengtian-payload, mengtian-resource, mengtian-exp-platform, mengtian-solar-a, mengtian-solar-b
- system-power, system-comm, system-thermal, system-docking, system-gnc, system-life
- shenzhou, tianzhou (visiting spacecraft; optional display in scene)
- station-body, station-antenna (external shared structures; selectable) if useful
Parent relationships: modules parent `station`; sections parent corresponding module; arrays/arms parent module; systems parent `station` (or a shared pseudo node); visiting craft parent `station`.

### Content rules (critical)
- Accuracy A only for values widely published by official sources: Tianhe axial length ~16.6 m, max diameter ~4.2 m; Wentian/Mengtian ~17.9 m, ~4.2 m; Tianhe each solar wing ~67 m²; Wentian/Mengtian each large solar wing ~138 m²; 6 wings; big arm ~10.2 m/7 DOF/~25 t; small arm ~5 m/7 DOF/~3 t; timeline dates (Tianhe 2021-04-29; Wentian 2022-07-24 launch, docking and Sept relocation; Mengtian 2022-10-31 launch, Nov 3 T-configuration); orbit ~340–450 km, inclination ~41.5°, period ~92 min. Mark these clearly. Do not invent other precise numbers.
- B for proportions/appearance inferred from public images: module section arrangement, docking port positioning, external payload frames, radiator appearance.
- C for internal layout, cabin racks, conceptual cable/fluid routing, internal equipment; LCD/hatch details.
- D for solar-wing deployment timing, robotic arm joint motion, orbital animation, vehicle approach path.
- Where unknown, write exactly "公开资料未确认" rather than a number. Do not fabricate telemetry, internal part counts, screw specs, or proprietary details.
- Write in Chinese; professional aerospace tone. English names for all components (e.g. Core Module, Node Cabin, Wentian Laboratory Module, Large Robotic Arm, Flexible Solar Wing). Avoid unsupported claims ("世界领先", "完全自主" except established phrasing, etc.).
- References: every component should have 1–3 referenceIds that exist. Reference descriptions in `RESEARCH.md` should note certainty and reconstructed/demo elements.

### Timeline stages (exactly 6, index 0–5)
0 2021.04.29 天和核心舱入轨
1 2022.07.24 问天实验舱发射入轨（示意）
2 2022.07.25 问天与天和交会对接（示意）
3 2022.09.30 问天转位至侧向停泊口（示意）
4 2022.10.31 梦天实验舱发射并对接（示意）
5 2022.11.03 梦天转位，T 字基本构型完成
Descriptions should be careful with dates; label animation as 科普示意 / 非真实轨道动力学.
