/**
 * components.js — 天宫空间站部件、结构与系统数据
 *
 * 数据契约见 docs/DATA_SCHEMA.md。撰写口径：
 *  - A 级：官方公开资料可确认的构型、日期、功能及被广泛引用的尺寸；
 *  - B 级：依据公开报道、官方影像推断的比例或数值，非官方精确参数；
 *  - C 级：舱内布局、机柜与管路等科普化重构，不作工程依据；
 *  - D 级：展开过程、机械臂运动与轨道动画，仅用于交互演示。
 *  - 未知数值一律写作“公开资料未确认”，不虚构部件数量、遥测或专有数据。
 *  - modelDimensions 为演示模型的包围盒近似值（x 为轴向/展开方向），不构成官方参数。
 */

export const ACCURACY_LEVELS = {
  A: {
    key: 'A',
    label: '官方参数',
    short: '官方',
    description: '公开官方资料可确认的尺寸、构型或功能。'
  },
  B: {
    key: 'B',
    label: '公开资料近似',
    short: '近似',
    description: '依据公开报道、官方影像或科普资料推断的比例与数值，非官方精确参数。'
  },
  C: {
    key: 'C',
    label: '科普示意',
    short: '示意',
    description: '舱内布局、设备机柜与管路走向等依据公开影像的科普化重构，不作工程依据。'
  },
  D: {
    key: 'D',
    label: '动画模拟',
    short: '模拟',
    description: '运动时序、展开过程与轨道动画为交互演示，并非真实动力学或遥测数据。'
  }
};

export const COMPONENTS = {
  'station': {
    id: 'station',
    parentId: null,
    name: '天宫空间站组合体',
    englishName: 'Tiangong Space Station',
    shortName: '天宫',
    category: '组合体',
    module: '共享',
    selectable: true,
    accuracyLevel: 'A',
    summary: '三舱“T”字基本构型、约 400 km 近地轨道长期载人飞行的国家级太空实验室。',
    description: '天宫空间站由中国空间站“天和”核心舱、“问天”实验舱与“梦天”实验舱在轨组装而成，2022 年 11 月完成“T”字基本构型。三个舱段分别承担组合体统一控制、科学实验与载荷支持等职能，并通过对接口接纳神舟载人飞船与天舟货运飞船。空间站运行于约 340–450 km 高度的近地轨道，轨道倾角约 41.5°，轨道周期约 92 min。',
    function: '作为长期在轨的载人航天基础设施，支持航天员驻留轮换、空间科学与应用实验、技术试验以及在轨维护与扩展。',
    specs: [
      { label: '基本构型', value: '三舱“T”字构型（天和 + 问天 + 梦天）', accuracyLevel: 'A', note: '2022 年 11 月完成' },
      { label: '轨道高度', value: '约 340–450 km', accuracyLevel: 'A' },
      { label: '轨道倾角', value: '约 41.5°', accuracyLevel: 'A' },
      { label: '轨道周期', value: '约 92 min', accuracyLevel: 'A' },
      { label: '柔性太阳翼', value: '6 翼（三舱各 2 翼）', accuracyLevel: 'A' },
      { label: '太阳翼总面积', value: '约 686 m²（2 × 67 + 4 × 138，据公开单翼面积推算）', accuracyLevel: 'B', note: '推算值，非官方公布总面积' },
      { label: '驻留乘组规模', value: '3 人常态驻留，轮换期间可短期支持 6 人', accuracyLevel: 'B', note: '公开资料常见表述' }
    ],
    structure: [
      '由天和核心舱、问天实验舱、梦天实验舱三个主要舱段对接组成。',
      '核心舱节点舱提供前向、径向与两个侧向接口；资源舱后端对接天舟货运飞船。',
      '两实验舱转位后停泊于核心舱节点舱两侧，形成“T”字构型。',
      '三舱各配置一对柔性太阳翼，整站共 6 翼；各舱电源可并网运行（公开资料表述）。'
    ],
    relations: ['tianhe', 'wentian', 'mengtian', 'shenzhou', 'tianzhou', 'system-power', 'system-comm', 'system-thermal', 'system-docking', 'system-gnc', 'system-life'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC', 'SCIO-WP-2021'],
    tags: ['组合体', '三舱构型', '近地轨道', '载人空间站'],
    modelDimensions: null
  },

  'tianhe': {
    id: 'tianhe',
    parentId: 'station',
    name: '天和核心舱',
    englishName: 'Tianhe Core Module',
    shortName: '天和',
    category: '舱段',
    module: '天和',
    selectable: true,
    accuracyLevel: 'A',
    summary: '空间站首个入轨舱段，承担组合体统一控制与航天员生活支持。',
    description: '天和核心舱于 2021 年 4 月 29 日由长征五号B 运载火箭在文昌航天发射场发射入轨，是空间站建造的起点。舱段轴向长度约 16.6 m，最大直径约 4.2 m，由节点舱、小柱段、大柱段与资源舱组成。作为组合体的“中枢”，它提供交会对接与停泊接口、航天员生活与工作空间、舱外机械臂支持以及整站统一控制能力。',
    function: '承担组合体姿态与轨道统一控制、交会对接引导、航天员生活支持、机械臂操作与部分科学实验支持。',
    specs: [
      { label: '轴向长度', value: '约 16.6 m', accuracyLevel: 'A' },
      { label: '最大直径', value: '约 4.2 m', accuracyLevel: 'A' },
      { label: '发射时间', value: '2021-04-29', accuracyLevel: 'A', note: '长征五号B 运载火箭，文昌航天发射场' },
      { label: '舱段组成', value: '节点舱 + 小柱段 + 大柱段 + 资源舱', accuracyLevel: 'A' },
      { label: '柔性太阳翼', value: '2 翼，单翼面积约 67 m²', accuracyLevel: 'A' },
      { label: '在轨质量', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '前端节点舱：设前向对接口、两个侧向停泊口与一个径向对接口。',
      '小柱段与大柱段：乘组生活与工作主空间，外部布置太阳翼安装区与机械臂基座。',
      '后端资源舱：集中布置推进、能源与资源类设备，尾端设后向对接口。',
      '两侧各一对柔性太阳翼，单翼展开面积约 67 m²。'
    ],
    relations: ['station', 'tianhe-node', 'tianhe-living', 'tianhe-resource', 'tianhe-front-dock', 'tianhe-rear-dock', 'tianhe-radial-dock', 'tianhe-big-arm', 'tianhe-solar-a', 'tianhe-solar-b'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['核心舱', '组合体控制', '交会对接', '柔性太阳翼'],
    modelDimensions: { x: 16.6, y: 4.2, z: 4.2, unit: 'm' }
  },

  'tianhe-node': {
    id: 'tianhe-node',
    parentId: 'tianhe',
    name: '节点舱',
    englishName: 'Node Cabin',
    shortName: '节点舱',
    category: '功能舱',
    module: '天和',
    selectable: true,
    accuracyLevel: 'A',
    summary: '核心舱前端的多接口中枢，连接来访飞船与两实验舱停泊口。',
    description: '节点舱位于天和核心舱前端，是空间站组合体的对接与人员通行枢纽。其前向端口承担神舟载人飞船的轴向对接，两个侧向端口在实验舱转位后作为停泊口，径向端口支持径向交会对接。舱内设置通道与舱门，构成航天员在舱段之间往返的节点；节点舱同时设有可用于出舱活动准备的气闸设施（公开资料表述），后续以问天气闸舱为主气闸。',
    function: '提供多方向交会对接与停泊接口，组织舱段间人员与物资通行，并保留出舱活动的备份通道。',
    specs: [
      { label: '接口数量', value: '4 个：前向轴向、径向及两个侧向停泊口', accuracyLevel: 'A' },
      { label: '主要用途', value: '轴向/径向载人飞船对接、实验舱停泊、舱段间通行', accuracyLevel: 'A' },
      { label: '舱内通道', value: '连接小柱段与各接口舱门', accuracyLevel: 'B' },
      { label: '舱内设备布置', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '短柱形多接口舱体，外表面布置对接机构、舱门与外部设备。',
      '前端轴向对接口用于神舟飞船对接，径向对接口用于径向交会对接。',
      '两个侧向停泊口在实验舱转位后形成长期结构连接。',
      '内壁设备、舱门细节为公开影像的科普化还原（C）。'
    ],
    relations: ['tianhe', 'tianhe-front-dock', 'tianhe-radial-dock', 'tianhe-living', 'wentian-berth', 'mengtian-berth', 'system-docking'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['节点舱', '对接口', '停泊口', '通行节点'],
    modelDimensions: { x: 2.8, y: 2.8, z: 2.8, unit: 'm' }
  },

  'tianhe-living': {
    id: 'tianhe-living',
    parentId: 'tianhe',
    name: '生活与工作段',
    englishName: 'Living and Working Compartment',
    shortName: '生活段',
    category: '舱段',
    module: '天和',
    selectable: true,
    accuracyLevel: 'B',
    summary: '核心舱主密封空间，布置睡眠、卫生、饮食与工作设施。',
    description: '生活与工作段由小柱段与大柱段组成，是航天员长期驻留的主要活动空间，设有睡眠区、卫生区、餐饮与锻炼设施以及工作台。舱内环境由环境控制与生命保障系统维持压力、温湿度与气体成分。舱壁内侧布置设备机柜与储物单元；具体分区与机柜编号属公开影像的科普化还原，不构成舱内布局依据。',
    function: '为乘组提供长期在轨生活、工作、锻炼与休息空间，并容纳部分舱内实验与设备机柜。',
    specs: [
      { label: '睡眠区', value: '核心舱设置 3 个睡眠区', accuracyLevel: 'B', note: '公开资料常见表述' },
      { label: '卫生区', value: '1 个', accuracyLevel: 'B', note: '公开资料常见表述' },
      { label: '主密封舱直径', value: '大柱段约 4.2 m', accuracyLevel: 'A' },
      { label: '舱内机柜数量', value: '公开资料未确认', accuracyLevel: null },
      { label: '舱内布局', value: '公开影像科普化还原（C 级示意）', accuracyLevel: 'C' }
    ],
    structure: [
      '小柱段：靠近节点舱，连接通道与生活设施。',
      '大柱段：直径约 4.2 m 的主密封舱段，布置工作与生活设施。',
      '舱内设备机柜、储物单元与照明为科普示意（C）。'
    ],
    relations: ['tianhe', 'tianhe-node', 'tianhe-resource', 'system-life', 'system-thermal'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['生活区', '睡眠区', '密封舱', '环控生保'],
    modelDimensions: { x: 7.6, y: 4.2, z: 4.2, unit: 'm' }
  },

  'tianhe-resource': {
    id: 'tianhe-resource',
    parentId: 'tianhe',
    name: '资源舱',
    englishName: 'Tianhe Resource Cabin',
    shortName: '资源舱',
    category: '功能舱',
    module: '天和',
    selectable: true,
    accuracyLevel: 'B',
    summary: '核心舱后端资源舱，集中布置推进、能源与资源类设备。',
    description: '资源舱位于天和核心舱后端，集中安装推进、能源与部分热控资源设备，为组合体早期姿态与轨道控制提供保障。舱体外部布置发动机、贮箱与部分天线，尾端设后向对接口用于天舟货运飞船停靠。公开资料对舱内设备的具体数量与布局未作披露。',
    function: '集中承载推进、能源与热控资源设备，并作为天舟货运飞船的后向对接与补给节点。',
    specs: [
      { label: '轴向位置', value: '核心舱后端', accuracyLevel: 'A' },
      { label: '主要设备', value: '推进、能源与资源类设备（配置细节公开资料未确认）', accuracyLevel: 'B' },
      { label: '后向对接口', value: '1 个，对接天舟货运飞船', accuracyLevel: 'A' },
      { label: '推进剂贮量', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '后端密封/非密封资源舱体，外部布置发动机与贮箱。',
      '尾端对接机构与天舟货运飞船连接，形成补给通道。',
      '设备布局与管路连接为概念示意（C）。'
    ],
    relations: ['tianhe', 'tianhe-living', 'tianhe-rear-dock', 'system-power', 'system-gnc', 'tianzhou'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['资源舱', '推进', '能源', '后向对接'],
    modelDimensions: { x: 4.0, y: 4.2, z: 4.2, unit: 'm' }
  },

  'tianhe-front-dock': {
    id: 'tianhe-front-dock',
    parentId: 'tianhe-node',
    name: '前向对接口',
    englishName: 'Forward Axial Docking Port',
    shortName: '前向口',
    category: '对接口',
    module: '天和',
    selectable: true,
    accuracyLevel: 'A',
    summary: '节点舱前端的轴向对接口，用于神舟载人飞船轴向对接。',
    description: '前向对接口位于节点舱前端，采用周边式对接机构，可与来访航天器的对接机构配合完成轴向交会对接。问天、梦天实验舱在轨组装期间曾先后对接于此，随后经转位机构转移至侧向停泊口。对接完成后形成密封通道，供航天员与物资通行。',
    function: '承担实验舱组装期的临时对接与神舟载人飞船长期停靠，提供人员通行通道。',
    specs: [
      { label: '接口位置', value: '节点舱前端轴向', accuracyLevel: 'A' },
      { label: '对接机构形式', value: '周边式对接机构（公开资料常见表述）', accuracyLevel: 'B' },
      { label: '主要对接目标', value: '神舟载人飞船；实验舱转位前临时对接', accuracyLevel: 'A' },
      { label: '通道直径', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '对接机构由导向、锁紧、密封与电气连接等部分组成。',
      '对接后与来访航天器形成封闭通道，供乘员通行。',
      '机构细节与内部尺寸为概念示意（C）。'
    ],
    relations: ['tianhe-node', 'tianhe', 'wentian', 'mengtian', 'shenzhou', 'system-docking'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['对接口', '轴向对接', '神舟飞船', '转位'],
    modelDimensions: { x: 1.0, y: 1.0, z: 1.0, unit: 'm' }
  },

  'tianhe-rear-dock': {
    id: 'tianhe-rear-dock',
    parentId: 'tianhe-resource',
    name: '后向对接口',
    englishName: 'Aft Axial Docking Port',
    shortName: '后向口',
    category: '对接口',
    module: '天和',
    selectable: true,
    accuracyLevel: 'A',
    summary: '资源舱尾端的轴向对接口，用于天舟货运飞船对接补给。',
    description: '后向对接口位于资源舱尾端，用于天舟货运飞船的轴向对接。货运飞船停靠期间通过对接通道为空间站补给推进剂、货物与实验载荷，并在部分任务中承担组合体轨道维持支持。该接口是空间站物资补给链路的关键节点。',
    function: '承担天舟货运飞船轴向对接，提供货物、推进剂与载荷补给通道。',
    specs: [
      { label: '接口位置', value: '资源舱尾端轴向', accuracyLevel: 'A' },
      { label: '主要对接目标', value: '天舟货运飞船', accuracyLevel: 'A' },
      { label: '补给类型', value: '货物、推进剂与实验载荷补给', accuracyLevel: 'A' },
      { label: '推进剂补加接口细节', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '对接机构与推进剂补加管路、电气连接集成于舱尾接口区。',
      '对接后形成加压通道并建立补给连接。',
      '管路走向与接口数量为概念示意（C）。'
    ],
    relations: ['tianhe-resource', 'tianhe', 'tianzhou', 'system-docking', 'system-power'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['对接口', '货运补给', '天舟', '推进剂补加'],
    modelDimensions: { x: 1.0, y: 1.0, z: 1.0, unit: 'm' }
  },

  'tianhe-radial-dock': {
    id: 'tianhe-radial-dock',
    parentId: 'tianhe-node',
    name: '径向对接口',
    englishName: 'Radial Docking Port',
    shortName: '径向口',
    category: '对接口',
    module: '天和',
    selectable: true,
    accuracyLevel: 'A',
    summary: '节点舱径向接口，提供径向交会对接与第二艘飞船停靠位。',
    description: '径向对接口位于节点舱径向方向，用于神舟载人飞船的径向交会对接。与轴向对接相比，径向对接在靠近过程中需要更精细的相对导航与姿态协调；相关能力在神舟任务中逐步应用与验证。该接口使空间站在轮换窗口内可同时停靠两艘载人飞船。',
    function: '提供径向交会对接位置，支持乘组轮换期间两艘神舟飞船同时停靠。',
    specs: [
      { label: '接口位置', value: '节点舱径向方向', accuracyLevel: 'A' },
      { label: '主要用途', value: '径向交会对接与载人飞船停靠', accuracyLevel: 'A' },
      { label: '同时停靠能力', value: '支持前向与径向两艘神舟同时停靠（公开任务记录）', accuracyLevel: 'A' },
      { label: '对接测量敏感器配置', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '径向布局的周边式对接机构，与轴向接口同属一套对接体系统。',
      '接口周围布置外部设备与照明，供来访航天器识别。',
      '靠近路径与对接时序为轨道动画示意（D）。'
    ],
    relations: ['tianhe-node', 'tianhe', 'shenzhou', 'system-docking', 'system-gnc'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['对接口', '径向对接', '神舟飞船', '乘组轮换'],
    modelDimensions: { x: 1.0, y: 1.0, z: 1.0, unit: 'm' }
  },

  'tianhe-big-arm': {
    id: 'tianhe-big-arm',
    parentId: 'tianhe',
    name: '大型机械臂',
    englishName: 'Large Robotic Arm',
    shortName: '大臂',
    category: '机械臂',
    module: '天和',
    selectable: true,
    accuracyLevel: 'A',
    summary: '长约 10.2 m 的 7 自由度舱外机械臂，可爬行并搬运大载荷。',
    description: '大型机械臂安装于天和核心舱外部，主臂长度约 10.2 m，具有 7 个自由度，最大承载能力约 25 t。它可沿舱体表面的目标适配器“爬行”改变作业位置，支持舱外载荷安装、舱体巡检与航天员出舱辅助。大型机械臂还可与问天实验舱的小型机械臂级联，形成作业范围更长的组合臂。',
    function: '在舱外执行载荷搬运与安装、舱体状态巡检、出舱活动支持，并可通过爬行在舱体表面转移工作位置。',
    specs: [
      { label: '主臂长度', value: '约 10.2 m', accuracyLevel: 'A' },
      { label: '自由度', value: '7 个', accuracyLevel: 'A' },
      { label: '最大承载能力', value: '约 25 t', accuracyLevel: 'A' },
      { label: '爬行能力', value: '可沿舱外目标适配器爬行转移', accuracyLevel: 'A' },
      { label: '与小型臂组合', value: '可级联为组合臂，作业范围扩展至约 15 m', accuracyLevel: 'B', note: '公开资料常见表述' },
      { label: '关节驱动与传感配置', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '由 7 个旋转关节串联组成，关节之间以复合材料臂杆连接。',
      '末端配置末端执行器与视觉相机，可抓取舱外目标适配器或载荷。',
      '基座可在核心舱外部目标适配器之间转移，实现爬行。',
      '关节外形、线缆与热控细节为建模仿真（C/D）。'
    ],
    relations: ['tianhe', 'wentian-small-arm', 'tianhe-node', 'tianhe-living', 'system-gnc'],
    referenceIds: ['CMSE-OFFICIAL', 'CASC-OFFICIAL'],
    tags: ['机械臂', '7 自由度', '舱外操作', '爬行'],
    modelDimensions: { x: 10.2, y: 1.2, z: 1.2, unit: 'm' }
  },

  'tianhe-solar-a': {
    id: 'tianhe-solar-a',
    parentId: 'tianhe',
    name: '核心舱柔性太阳翼 A（左翼）',
    englishName: 'Tianhe Flexible Solar Wing A',
    shortName: '左太阳翼',
    category: '太阳翼',
    module: '天和',
    selectable: true,
    accuracyLevel: 'A',
    summary: '核心舱左侧柔性太阳翼，单翼面积约 67 m²。',
    description: '天和核心舱两侧各配置一片柔性太阳翼，本翼为左侧一片，单翼展开面积约 67 m²。电池毯采用柔性基板与空间用太阳能电池，发射时折叠收拢以适应运载包络，在轨展开后由驱动机构跟踪太阳方位。核心舱两翼合计约 134 m²，与实验舱太阳翼共同构成整站能源来源。',
    function: '将太阳辐照转换为电能，为核心舱与组合体提供主电源，并支持阴影期储能充放电。',
    specs: [
      { label: '单翼面积', value: '约 67 m²', accuracyLevel: 'A' },
      { label: '核心舱太阳翼数量', value: '2 翼（左、右各一）', accuracyLevel: 'A' },
      { label: '展开长度', value: '约 12.4 m', accuracyLevel: 'B', note: '模型取值，官方未公布统一数值' },
      { label: '展开宽度', value: '约 5.4 m', accuracyLevel: 'B', note: '模型取值，官方未公布统一数值' },
      { label: '电池类型', value: '空间用太阳能电池（具体结构与效率公开资料未确认）', accuracyLevel: 'B' }
    ],
    structure: [
      '两片柔性电池毯并联，中间为展开机构与中心承力杆。',
      '根部驱动机构实现太阳跟踪与展开锁定。',
      '展开过程与折叠时序为动画模拟（D）。'
    ],
    relations: ['tianhe', 'tianhe-solar-b', 'system-power'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['太阳翼', '柔性电池毯', '发电', '左翼'],
    modelDimensions: { x: 12.4, y: 0.2, z: 5.4, unit: 'm' }
  },

  'tianhe-solar-b': {
    id: 'tianhe-solar-b',
    parentId: 'tianhe',
    name: '核心舱柔性太阳翼 B（右翼）',
    englishName: 'Tianhe Flexible Solar Wing B',
    shortName: '右太阳翼',
    category: '太阳翼',
    module: '天和',
    selectable: true,
    accuracyLevel: 'A',
    summary: '核心舱右侧柔性太阳翼，单翼面积约 67 m²。',
    description: '天和核心舱右侧柔性太阳翼，单翼展开面积约 67 m²，与左翼构型相同、安装方向相对。两翼在轨展开后由驱动机构协同跟踪太阳方位，为核心舱提供主电源；在组合体并网供电条件下，也可向其他舱段输送电能。',
    function: '与左翼共同构成核心舱主电源，向组合体电网供电。',
    specs: [
      { label: '单翼面积', value: '约 67 m²', accuracyLevel: 'A' },
      { label: '核心舱太阳翼数量', value: '2 翼（左、右各一）', accuracyLevel: 'A' },
      { label: '展开长度', value: '约 12.4 m', accuracyLevel: 'B', note: '模型取值，官方未公布统一数值' },
      { label: '展开宽度', value: '约 5.4 m', accuracyLevel: 'B', note: '模型取值，官方未公布统一数值' },
      { label: '实际发电功率', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '与左翼同构的两片柔性电池毯与中心承力杆。',
      '根部驱动机构完成太阳跟踪与锁定。',
      '展开过程为动画模拟（D）。'
    ],
    relations: ['tianhe', 'tianhe-solar-a', 'system-power'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['太阳翼', '柔性电池毯', '发电', '右翼'],
    modelDimensions: { x: 12.4, y: 0.2, z: 5.4, unit: 'm' }
  },

  'wentian': {
    id: 'wentian',
    parentId: 'station',
    name: '问天实验舱',
    englishName: 'Wentian Laboratory Module',
    shortName: '问天',
    category: '舱段',
    module: '问天',
    selectable: true,
    accuracyLevel: 'A',
    summary: '空间站首个实验舱，兼作主气闸出舱口与核心舱功能备份。',
    description: '问天实验舱于 2022 年 7 月 24 日发射入轨，次日与天和核心舱前向端口对接，同年 9 月 30 日转位至侧向停泊口。舱段全长约 17.9 m，最大直径约 4.2 m，由工作舱、气闸舱与资源舱组成，配置一对大面积柔性太阳翼。它既承担空间生命科学等实验任务，也是航天员出舱活动的主气闸，并可在需要时为组合体提供关键功能备份。',
    function: '提供科学实验与生命生态实验支持、主气闸出舱通道、部分生活泊位，并具备对核心舱关键功能的备份支持能力。',
    specs: [
      { label: '全长', value: '约 17.9 m', accuracyLevel: 'A' },
      { label: '最大直径', value: '约 4.2 m', accuracyLevel: 'A' },
      { label: '发射时间', value: '2022-07-24', accuracyLevel: 'A', note: '长征五号B 运载火箭' },
      { label: '前向对接', value: '2022-07-25', accuracyLevel: 'A' },
      { label: '转位至侧向停泊口', value: '2022-09-30', accuracyLevel: 'A' },
      { label: '柔性太阳翼', value: '2 翼，单翼面积约 138 m²', accuracyLevel: 'A' },
      { label: '睡眠区', value: '3 个；卫生区 1 个', accuracyLevel: 'B', note: '公开资料常见表述' },
      { label: '实验机柜数量', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '工作舱：主密封空间，布置科学实验机柜与航天员生活泊位。',
      '气闸舱：主气闸出舱口，配置舱外活动支持设备。',
      '资源舱：集中布置推进、能源与热控资源设备。',
      '外部配置一对约 138 m² 柔性太阳翼与小型机械臂安装基座。'
    ],
    relations: ['station', 'tianhe', 'wentian-berth', 'wentian-working', 'wentian-airlock', 'wentian-resource', 'wentian-small-arm', 'wentian-exp-platform', 'wentian-solar-a', 'wentian-solar-b', 'system-life'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['实验舱', '主气闸', '生命科学', '转位'],
    modelDimensions: { x: 17.9, y: 4.2, z: 4.2, unit: 'm' }
  },

  'wentian-berth': {
    id: 'wentian-berth',
    parentId: 'wentian',
    name: '侧向停泊接口（转位对接端）',
    englishName: 'Wentian Lateral Berthing Interface',
    shortName: '停泊口',
    category: '对接口',
    module: '问天',
    selectable: true,
    accuracyLevel: 'A',
    summary: '问天转位后与节点舱侧向停泊口相连，形成长期组合体连接。',
    description: '问天实验舱发射后先与天和核心舱前向端口对接，再由舱段转位机构沿平面旋转约 90°，停泊于节点舱侧向停泊口。该接口在转位后承担结构连接，并承载跨舱的电力、数据与热控等连接（连接形式与接口数量公开资料未确认）。转位操作于 2022 年 9 月 30 日实施，是空间站建造的关键节点。',
    function: '在转位后实现问天实验舱与核心舱的长期结构连接与跨舱资源联通通道。',
    specs: [
      { label: '转位日期', value: '2022-09-30', accuracyLevel: 'A' },
      { label: '停泊位置', value: '节点舱侧向停泊口', accuracyLevel: 'A' },
      { label: '转位方式', value: '舱段平面转位（机构安装位置与构型公开资料未确认）', accuracyLevel: 'B' },
      { label: '跨舱连接接口', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '对接机构与转位机构配合，完成由前向到侧向的平面转移。',
      '转位完成后锁紧形成刚性结构连接。',
      '跨舱电缆与管路沿对接面布置，具体走向为概念示意（C）。'
    ],
    relations: ['wentian', 'tianhe-node', 'tianhe', 'system-docking', 'system-power'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['停泊口', '转位', '结构连接', 'T 字构型'],
    modelDimensions: { x: 1.0, y: 1.0, z: 1.0, unit: 'm' }
  },

  'wentian-working': {
    id: 'wentian-working',
    parentId: 'wentian',
    name: '问天工作舱',
    englishName: 'Wentian Working Cabin',
    shortName: '工作舱',
    category: '功能舱',
    module: '问天',
    selectable: true,
    accuracyLevel: 'B',
    summary: '实验舱主密封工作空间，布置科学实验机柜与生活泊位。',
    description: '工作舱是问天实验舱容积最大的密封舱段，内部布置科学实验机柜、载荷支持设备以及航天员睡眠与卫生设施。公开资料显示问天舱内设置 3 个睡眠区和 1 个卫生区，与核心舱共同满足乘组轮换期间 6 人短期驻留需求。舱内具体机柜编号、载荷布局与内部通道为公开影像的科普化还原，不作工程依据。',
    function: '提供微重力科学实验、生命生态实验与航天员生活支持空间，并扩展整站驻留能力。',
    specs: [
      { label: '睡眠区', value: '3 个', accuracyLevel: 'B', note: '公开资料常见表述' },
      { label: '卫生区', value: '1 个', accuracyLevel: 'B', note: '公开资料常见表述' },
      { label: '生命生态实验', value: '支持生命生态类实验（公开任务报道）', accuracyLevel: 'B' },
      { label: '实验机柜数量与布局', value: '公开资料未确认', accuracyLevel: null },
      { label: '舱内结构', value: '公开影像科普化还原（C 级示意）', accuracyLevel: 'C' }
    ],
    structure: [
      '主密封工作舱段，内部设置实验机柜安装面与载荷支持设备。',
      '睡眠与卫生设施靠近舱段一端布置（公开影像近似）。',
      '舱内机柜、照明与储物单元为科普示意（C）。'
    ],
    relations: ['wentian', 'wentian-airlock', 'wentian-resource', 'wentian-exp-platform', 'system-life'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['工作舱', '实验机柜', '睡眠区', '生命生态'],
    modelDimensions: { x: 8.0, y: 4.2, z: 4.2, unit: 'm' }
  },

  'wentian-airlock': {
    id: 'wentian-airlock',
    parentId: 'wentian',
    name: '问天气闸舱（主气闸）',
    englishName: 'Wentian Airlock',
    shortName: '气闸舱',
    category: '气闸',
    module: '问天',
    selectable: true,
    accuracyLevel: 'B',
    summary: '空间站主气闸舱，提供航天员舱外活动的出舱通道与设备支持。',
    description: '问天气闸舱是空间站执行出舱活动的主气闸，配置内、外舱门，以及舱外航天服安装与泄压/复压设备。在问天实验舱入轨之前，航天员出舱活动使用天和核心舱节点舱的气闸设施；问天入轨后，主气闸转移至此，出舱活动的空间与设备条件得到改善。出舱口的尺寸、朝向与内部设备布局为公开影像近似，具体参数公开资料未确认。',
    function: '提供出舱活动准备、泄压与复压、舱内外过渡与舱外航天服支持。',
    specs: [
      { label: '功能定位', value: '空间站主气闸舱', accuracyLevel: 'B', note: '公开资料常见表述；备份气闸位于核心舱节点舱' },
      { label: '出舱舱门', value: '内、外两道舱门', accuracyLevel: 'B' },
      { label: '出舱口尺寸', value: '公开资料未确认', accuracyLevel: null },
      { label: '泄压/复压能力', value: '支持出舱活动准备（具体指标公开资料未确认）', accuracyLevel: 'B' }
    ],
    structure: [
      '气闸舱为独立密封舱段，设内舱门与外舱门。',
      '舱内布置舱外航天服安装与支持设备。',
      '外舱门朝向出舱作业面，具体方位为公开影像近似（C）。'
    ],
    relations: ['wentian', 'wentian-working', 'tianhe-node', 'system-life'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['气闸舱', '出舱活动', '舱外航天服', '主气闸'],
    modelDimensions: { x: 4.6, y: 4.2, z: 4.2, unit: 'm' }
  },

  'wentian-resource': {
    id: 'wentian-resource',
    parentId: 'wentian',
    name: '问天资源舱',
    englishName: 'Wentian Resource Cabin',
    shortName: '资源舱',
    category: '功能舱',
    module: '问天',
    selectable: true,
    accuracyLevel: 'B',
    summary: '问天后端资源舱，布置推进、供电与热控资源设备。',
    description: '资源舱位于问天实验舱后端，集中布置推进、供电、热控等资源设备，并为柔性太阳翼与小型机械臂提供安装基础。其设备配置支持实验舱长期独立运行与组合体资源调度；公开资料未披露具体设备数量与舱内布局。',
    function: '承载推进、供电、热控资源设备，支撑实验舱独立运行与太阳翼、机械臂安装。',
    specs: [
      { label: '太阳翼安装', value: '2 翼，单翼面积约 138 m²', accuracyLevel: 'A' },
      { label: '主要功能', value: '推进、供电与热控资源设备承载', accuracyLevel: 'B' },
      { label: '设备配置与舱内布局', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '后端资源舱体，外部布置发动机与部分热控设备。',
      '太阳翼驱动机构与小型机械臂基座安装于舱外相应位置。',
      '设备与管路布局为概念示意（C）。'
    ],
    relations: ['wentian', 'wentian-solar-a', 'wentian-solar-b', 'wentian-small-arm', 'system-power', 'system-thermal'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['资源舱', '推进', '供电', '热控'],
    modelDimensions: { x: 4.0, y: 4.2, z: 4.2, unit: 'm' }
  },

  'wentian-small-arm': {
    id: 'wentian-small-arm',
    parentId: 'wentian',
    name: '小型机械臂',
    englishName: 'Wentian Small Robotic Arm',
    shortName: '小臂',
    category: '机械臂',
    module: '问天',
    selectable: true,
    accuracyLevel: 'A',
    summary: '问天实验舱约 5 m 的 7 自由度机械臂，可与大臂组合扩展范围。',
    description: '小型机械臂安装于问天实验舱外部，长度约 5 m，具有 7 个自由度，承载能力约 3 t，主要用于精细舱外操作与舱外载荷照料。小型机械臂可与天和核心舱的大型机械臂级联组成组合臂，将作业覆盖范围扩展至约 15 m。其关节参数与控制模式公开资料未作完整披露。',
    function: '执行精细舱外操作、载荷安装与巡检，并可与大型机械臂组合使用。',
    specs: [
      { label: '长度', value: '约 5 m', accuracyLevel: 'A' },
      { label: '自由度', value: '7 个', accuracyLevel: 'A' },
      { label: '承载能力', value: '约 3 t', accuracyLevel: 'A' },
      { label: '与大臂组合', value: '可级联为约 15 m 组合臂', accuracyLevel: 'B', note: '公开资料常见表述' },
      { label: '关节运动参数', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '与大型机械臂同属 7 自由度串联构型，尺度更小。',
      '末端配置执行器与视觉设备，用于载荷抓取与状态检查。',
      '关节运动与组合臂工作过程为动画模拟（D）。'
    ],
    relations: ['wentian', 'tianhe-big-arm', 'wentian-exp-platform', 'wentian-resource'],
    referenceIds: ['CMSE-OFFICIAL', 'CASC-OFFICIAL'],
    tags: ['机械臂', '小臂', '精细操作', '组合臂'],
    modelDimensions: { x: 5.1, y: 0.8, z: 0.8, unit: 'm' }
  },

  'wentian-exp-platform': {
    id: 'wentian-exp-platform',
    parentId: 'wentian',
    name: '问天舱外载荷平台',
    englishName: 'Wentian Exposed Payload Platform',
    shortName: '舱外平台',
    category: '平台',
    module: '问天',
    selectable: true,
    accuracyLevel: 'B',
    summary: '问天舱外设置的载荷安装与暴露实验接口区域。',
    description: '问天实验舱外部设有载荷安装接口与暴露实验支持区域，可安装舱外科学载荷、材料与器件暴露试验装置等。平台通过机械与电气接口与舱内载荷支持设备连接，并可由小型机械臂协助载荷操作。载荷位数量、单机接口规格与供电能力公开资料未确认。',
    function: '为舱外科学与技术试验载荷提供机械安装、供电、数据与热控支持条件。',
    specs: [
      { label: '载荷位数量', value: '公开资料未确认', accuracyLevel: null },
      { label: '安装接口', value: '标准载荷适配器（公开资料近似）', accuracyLevel: 'B' },
      { label: '支持实验类型', value: '舱外暴露、材料与器件试验（公开资料表述）', accuracyLevel: 'B' },
      { label: '供电与数据接口规格', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '载荷安装基板与适配器构成基本安装面。',
      '外部线缆与热控管路按概念示意布置（C）。',
      '平台朝向与外形尺寸为公开影像近似（B）。'
    ],
    relations: ['wentian', 'wentian-small-arm', 'wentian-working', 'system-comm'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['舱外平台', '暴露实验', '载荷安装', '载荷适配器'],
    modelDimensions: null
  },

  'wentian-solar-a': {
    id: 'wentian-solar-a',
    parentId: 'wentian',
    name: '问天实验舱柔性太阳翼 A',
    englishName: 'Wentian Flexible Solar Wing A',
    shortName: '太阳翼 A',
    category: '太阳翼',
    module: '问天',
    selectable: true,
    accuracyLevel: 'A',
    summary: '问天实验舱一侧的大面积柔性太阳翼，单翼面积约 138 m²。',
    description: '问天实验舱配置一对大面积柔性太阳翼，本翼为其中一片，单翼展开面积约 138 m²，约为核心舱单翼面积的两倍。电池毯发射时折叠收拢，在轨展开后由驱动机构跟踪太阳方位；两翼合计约 276 m²，是整站能源的主要来源之一。展开时序与姿态为动画示意。',
    function: '为问天实验舱及组合体电网提供主电源，并支持阴影期储能充放电。',
    specs: [
      { label: '单翼面积', value: '约 138 m²', accuracyLevel: 'A' },
      { label: '问天太阳翼数量', value: '2 翼', accuracyLevel: 'A' },
      { label: '展开长度', value: '约 15.0 m', accuracyLevel: 'B', note: '模型取值，官方未公布统一数值' },
      { label: '展开宽度', value: '约 9.2 m', accuracyLevel: 'B', note: '模型取值，官方未公布统一数值' },
      { label: '电池类型与效率', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '大面积柔性电池毯，中间为展开机构与承力桁架。',
      '根部驱动机构实现太阳跟踪与展开锁定。',
      '展开过程为动画模拟（D）。'
    ],
    relations: ['wentian', 'wentian-solar-b', 'system-power'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['太阳翼', '大面积柔性', '发电', '实验舱'],
    modelDimensions: { x: 15.0, y: 0.2, z: 9.2, unit: 'm' }
  },

  'wentian-solar-b': {
    id: 'wentian-solar-b',
    parentId: 'wentian',
    name: '问天实验舱柔性太阳翼 B',
    englishName: 'Wentian Flexible Solar Wing B',
    shortName: '太阳翼 B',
    category: '太阳翼',
    module: '问天',
    selectable: true,
    accuracyLevel: 'A',
    summary: '问天实验舱另一侧的大面积柔性太阳翼，单翼面积约 138 m²。',
    description: '问天实验舱另一侧的大面积柔性太阳翼，单翼展开面积约 138 m²，与 A 翼同构、安装方向相对。两翼在轨展开后协同跟踪太阳方位，与核心舱、梦天实验舱太阳翼共同构成 6 翼能源系统（公开资料表述）。实际发电功率与并网策略公开资料未确认。',
    function: '与 A 翼共同构成问天主电源，向组合体电网供电。',
    specs: [
      { label: '单翼面积', value: '约 138 m²', accuracyLevel: 'A' },
      { label: '问天太阳翼数量', value: '2 翼', accuracyLevel: 'A' },
      { label: '展开长度', value: '约 15.0 m', accuracyLevel: 'B', note: '模型取值，官方未公布统一数值' },
      { label: '展开宽度', value: '约 9.2 m', accuracyLevel: 'B', note: '模型取值，官方未公布统一数值' },
      { label: '实际发电功率', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '与 A 翼同构的柔性电池毯与展开桁架。',
      '根部驱动机构完成太阳跟踪与锁定。',
      '展开过程为动画模拟（D）。'
    ],
    relations: ['wentian', 'wentian-solar-a', 'system-power'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC'],
    tags: ['太阳翼', '大面积柔性', '发电', '实验舱'],
    modelDimensions: { x: 15.0, y: 0.2, z: 9.2, unit: 'm' }
  },

  'mengtian': {
    id: 'mengtian',
    parentId: 'station',
    name: '梦天实验舱',
    englishName: 'Mengtian Laboratory Module',
    shortName: '梦天',
    category: '舱段',
    module: '梦天',
    selectable: true,
    accuracyLevel: 'A',
    summary: '空间站第二个实验舱，配置货物气闸舱与舱外载荷实验平台。',
    description: '梦天实验舱于 2022 年 10 月 31 日发射入轨，随后完成与天和核心舱的对接；11 月 3 日转位至侧向停泊口，与问天实验舱共同构成空间站“T”字基本构型。舱段全长约 17.9 m，最大直径约 4.2 m，由工作舱、载荷舱与资源舱组成，配置货物气闸舱与舱外实验平台，主要面向微重力物理、材料与燃烧等科学实验。',
    function: '提供微重力物理、材料与燃烧等实验支持，具备货物与载荷经气闸进出舱外的能力，并承担载荷舱外暴露实验。',
    specs: [
      { label: '全长', value: '约 17.9 m', accuracyLevel: 'A' },
      { label: '最大直径', value: '约 4.2 m', accuracyLevel: 'A' },
      { label: '发射时间', value: '2022-10-31', accuracyLevel: 'A', note: '长征五号B 运载火箭' },
      { label: '转位完成', value: '2022-11-03', accuracyLevel: 'A', note: '空间站“T”字基本构型完成' },
      { label: '柔性太阳翼', value: '2 翼，单翼面积约 138 m²', accuracyLevel: 'A' },
      { label: '货物气闸舱', value: '1 个', accuracyLevel: 'A' },
      { label: '实验机柜数量', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '工作舱：主密封实验空间，布置科学实验机柜。',
      '载荷舱：承载货物气闸舱，并为舱外载荷实验平台提供安装基础。',
      '资源舱：集中布置推进、供电与热控资源设备。',
      '外部配置一对约 138 m² 柔性太阳翼，构成“T”字两翼。'
    ],
    relations: ['station', 'tianhe', 'mengtian-berth', 'mengtian-working', 'mengtian-cargo-airlock', 'mengtian-payload', 'mengtian-resource', 'mengtian-exp-platform', 'mengtian-solar-a', 'mengtian-solar-b', 'system-life'],
    referenceIds: ['CMSE-OFFICIAL', 'CMSE-20221107', 'CNSA-CSS-TOPIC'],
    tags: ['实验舱', '货物气闸', '舱外平台', 'T 字构型'],
    modelDimensions: { x: 17.9, y: 4.2, z: 4.2, unit: 'm' }
  },

  'mengtian-berth': {
    id: 'mengtian-berth',
    parentId: 'mengtian',
    name: '侧向停泊接口（转位对接端）',
    englishName: 'Mengtian Lateral Berthing Interface',
    shortName: '停泊口',
    category: '对接口',
    module: '梦天',
    selectable: true,
    accuracyLevel: 'A',
    summary: '梦天转位后与节点舱侧向停泊口相连，构成 T 字构型一侧。',
    description: '梦天实验舱发射后先与天和核心舱前向端口对接，随后由舱段转位机构转位并停泊于节点舱另一侧停泊口，于 2022 年 11 月 3 日完成，标志空间站“T”字基本构型建成。该接口在转位后承担结构连接与跨舱资源联通（接口形式与数量公开资料未确认）。转位过程为动画示意。',
    function: '在转位后实现梦天实验舱与核心舱的长期结构连接与跨舱资源联通通道。',
    specs: [
      { label: '转位完成日期', value: '2022-11-03', accuracyLevel: 'A' },
      { label: '停泊位置', value: '节点舱侧向停泊口', accuracyLevel: 'A' },
      { label: '转位方式', value: '舱段平面转位（机构细节公开资料未确认）', accuracyLevel: 'B' },
      { label: '跨舱连接接口', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '对接机构与转位机构配合完成由前向到侧向的平面转移。',
      '转位完成后锁紧形成刚性结构连接。',
      '跨舱电缆与管路沿对接面布置，具体走向为概念示意（C）。'
    ],
    relations: ['mengtian', 'tianhe-node', 'tianhe', 'system-docking', 'system-power'],
    referenceIds: ['CMSE-OFFICIAL', 'CMSE-20221107'],
    tags: ['停泊口', '转位', 'T 字构型', '结构连接'],
    modelDimensions: { x: 1.0, y: 1.0, z: 1.0, unit: 'm' }
  },

  'mengtian-working': {
    id: 'mengtian-working',
    parentId: 'mengtian',
    name: '梦天工作舱',
    englishName: 'Mengtian Working Cabin',
    shortName: '工作舱',
    category: '功能舱',
    module: '梦天',
    selectable: true,
    accuracyLevel: 'B',
    summary: '梦天主密封实验空间，面向微重力物理、材料与燃烧实验。',
    description: '工作舱是梦天实验舱的主密封实验空间，布置科学实验机柜与载荷支持设备。公开报道提及舱内配置流体物理、燃烧科学、材料科学等实验设施，用于微重力条件下的科学研究与技术试验。机柜数量、编号与舱内通道布局属公开影像的科普化还原，公开资料未确认。',
    function: '提供微重力物理、材料、燃烧等科学实验空间及载荷运行支持。',
    specs: [
      { label: '主要实验方向', value: '微重力物理、材料与燃烧等（公开资料表述）', accuracyLevel: 'B' },
      { label: '实验机柜数量', value: '公开资料未确认', accuracyLevel: null },
      { label: '舱内布局', value: '公开影像科普化还原（C 级示意）', accuracyLevel: 'C' }
    ],
    structure: [
      '主密封工作舱段，内部设置实验机柜安装面。',
      '载荷支持设备与数据/供电接口沿舱壁布置（C 级示意）。',
      '舱内通道、照明与储物为科普示意（C）。'
    ],
    relations: ['mengtian', 'mengtian-payload', 'mengtian-cargo-airlock', 'mengtian-resource', 'system-life'],
    referenceIds: ['CMSE-OFFICIAL', 'CMSE-20221107'],
    tags: ['工作舱', '微重力物理', '材料科学', '燃烧科学'],
    modelDimensions: { x: 8.0, y: 4.2, z: 4.2, unit: 'm' }
  },

  'mengtian-cargo-airlock': {
    id: 'mengtian-cargo-airlock',
    parentId: 'mengtian',
    name: '货物气闸舱',
    englishName: 'Mengtian Cargo Airlock',
    shortName: '货物气闸',
    category: '气闸',
    module: '梦天',
    selectable: true,
    accuracyLevel: 'B',
    summary: '梦天货物气闸舱，支持货物与载荷自动进出舱外平台。',
    description: '货物气闸舱是梦天实验舱实现载荷舱内外转移的关键设施，配置舱内、舱外舱门与载荷转移机构，可将实验载荷由舱内自动或半自动运送至舱外实验平台，减少对航天员出舱操作的依赖。舱门尺寸、转移机构行程与载荷包络公开资料未确认。',
    function: '提供货物与实验载荷的舱内外过渡通道，支持载荷自动进出舱外平台。',
    specs: [
      { label: '功能定位', value: '货物气闸舱', accuracyLevel: 'A' },
      { label: '进出舱方式', value: '自动/半自动载荷转移（公开资料近似）', accuracyLevel: 'B' },
      { label: '舱门尺寸', value: '公开资料未确认', accuracyLevel: null },
      { label: '载荷转移机构', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '气闸腔体与内、外两道舱门构成载荷过渡空间。',
      '载荷转移机构沿导轨将货物送至舱外平台。',
      '舱门与机构细节为概念示意（C）。'
    ],
    relations: ['mengtian', 'mengtian-payload', 'mengtian-exp-platform', 'mengtian-working'],
    referenceIds: ['CMSE-OFFICIAL', 'CMSE-20221107'],
    tags: ['货物气闸', '载荷转移', '舱外平台', '梦天'],
    modelDimensions: null
  },

  'mengtian-payload': {
    id: 'mengtian-payload',
    parentId: 'mengtian',
    name: '载荷舱',
    englishName: 'Mengtian Payload Cabin',
    shortName: '载荷舱',
    category: '功能舱',
    module: '梦天',
    selectable: true,
    accuracyLevel: 'B',
    summary: '梦天舱段组成部分，承载货物气闸舱与舱外平台安装基础。',
    description: '载荷舱是梦天实验舱的组成部分之一，与工作舱、资源舱共同构成舱段，内部集成货物气闸舱并为舱外载荷实验平台提供机械与电气安装基础。载荷舱的具体分区、结构形式与设备布置公开资料未确认，本模型按舱段组成作比例化表达。',
    function: '承载货物气闸与舱外平台接口，为载荷进出舱与舱外实验提供结构基础。',
    specs: [
      { label: '舱段组成', value: '工作舱 + 载荷舱 + 资源舱', accuracyLevel: 'A' },
      { label: '承载设施', value: '货物气闸舱与舱外实验平台安装基础', accuracyLevel: 'B' },
      { label: '内部结构与分区', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '与工作舱、资源舱连接，形成梦天舱段主体。',
      '集成货物气闸舱，并向外提供载荷平台安装面。',
      '内部分区为概念示意（C）。'
    ],
    relations: ['mengtian', 'mengtian-working', 'mengtian-cargo-airlock', 'mengtian-exp-platform', 'mengtian-resource'],
    referenceIds: ['CMSE-OFFICIAL', 'CMSE-20221107'],
    tags: ['载荷舱', '货物气闸', '舱外平台', '结构基础'],
    modelDimensions: null
  },

  'mengtian-resource': {
    id: 'mengtian-resource',
    parentId: 'mengtian',
    name: '梦天资源舱',
    englishName: 'Mengtian Resource Cabin',
    shortName: '资源舱',
    category: '功能舱',
    module: '梦天',
    selectable: true,
    accuracyLevel: 'B',
    summary: '梦天后端资源舱，布置推进、供电与热控资源设备。',
    description: '资源舱位于梦天实验舱端部，集中布置推进、供电与热控等资源设备，为实验舱长期稳定运行提供保障，并作为太阳翼等外部设备的安装基础。具体设备数量、贮箱布局与管路走向公开资料未确认。',
    function: '承载推进、供电与热控资源设备，支撑实验舱独立运行与外部设备安装。',
    specs: [
      { label: '太阳翼安装', value: '2 翼，单翼面积约 138 m²', accuracyLevel: 'A' },
      { label: '主要功能', value: '推进、供电与热控资源承载', accuracyLevel: 'B' },
      { label: '设备配置与管路布局', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '后端资源舱体，外部布置发动机与部分热控设备。',
      '太阳翼驱动机构安装于舱外相应位置。',
      '设备与管路布局为概念示意（C）。'
    ],
    relations: ['mengtian', 'mengtian-solar-a', 'mengtian-solar-b', 'system-power', 'system-thermal'],
    referenceIds: ['CMSE-OFFICIAL', 'CMSE-20221107'],
    tags: ['资源舱', '推进', '供电', '热控'],
    modelDimensions: { x: 4.0, y: 4.2, z: 4.2, unit: 'm' }
  },

  'mengtian-exp-platform': {
    id: 'mengtian-exp-platform',
    parentId: 'mengtian',
    name: '舱外载荷实验平台',
    englishName: 'Mengtian Exposed Experiment Platform',
    shortName: '舱外平台',
    category: '平台',
    module: '梦天',
    selectable: true,
    accuracyLevel: 'B',
    summary: '梦天舱外载荷实验平台，提供载荷安装与暴露实验条件。',
    description: '梦天实验舱舱外载荷实验平台用于安装与运行舱外科学载荷，支持材料暴露、空间环境探测等实验，并与货物气闸舱配合实现载荷进出舱。公开报道提及该平台还具备在轨释放微纳卫星的相关能力，具体实现方式与载荷适配器数量公开资料未确认。',
    function: '为舱外载荷提供机械安装、供电、数据与热控条件，并支持载荷经气闸进出舱。',
    specs: [
      { label: '载荷位数量', value: '公开资料未确认', accuracyLevel: null },
      { label: '安装接口', value: '标准载荷适配器（公开资料近似）', accuracyLevel: 'B' },
      { label: '在轨释放微纳卫星', value: '公开报道提及，具体能力与流程公开资料未确认', accuracyLevel: 'B' },
      { label: '供电与数据接口规格', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '载荷安装基板与适配器构成安装面。',
      '与货物气闸舱对接的载荷转移通道为概念示意（C）。',
      '外部线缆与热控布置按公开影像近似（B）。'
    ],
    relations: ['mengtian', 'mengtian-cargo-airlock', 'mengtian-payload', 'system-comm', 'system-power'],
    referenceIds: ['CMSE-OFFICIAL', 'CMSE-20221107'],
    tags: ['舱外平台', '暴露实验', '载荷适配器', '微纳卫星'],
    modelDimensions: null
  },

  'mengtian-solar-a': {
    id: 'mengtian-solar-a',
    parentId: 'mengtian',
    name: '梦天实验舱柔性太阳翼 A',
    englishName: 'Mengtian Flexible Solar Wing A',
    shortName: '太阳翼 A',
    category: '太阳翼',
    module: '梦天',
    selectable: true,
    accuracyLevel: 'A',
    summary: '梦天实验舱一侧的大面积柔性太阳翼，单翼面积约 138 m²。',
    description: '梦天实验舱配置一对大面积柔性太阳翼，本翼为其中一片，单翼展开面积约 138 m²。三舱 6 翼太阳翼总展开面积约 686 m²（据公开单翼面积推算），构成空间站能源系统的主体。展开时序、太阳跟踪角度与阴影期充放电过程为动画示意，非真实遥测。',
    function: '为梦天实验舱及组合体电网提供主电源。',
    specs: [
      { label: '单翼面积', value: '约 138 m²', accuracyLevel: 'A' },
      { label: '梦天太阳翼数量', value: '2 翼', accuracyLevel: 'A' },
      { label: '展开长度', value: '约 15.0 m', accuracyLevel: 'B', note: '模型取值，官方未公布统一数值' },
      { label: '展开宽度', value: '约 9.2 m', accuracyLevel: 'B', note: '模型取值，官方未公布统一数值' },
      { label: '电池类型与效率', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '大面积柔性电池毯，中间为展开机构与承力桁架。',
      '根部驱动机构实现太阳跟踪与展开锁定。',
      '展开过程为动画模拟（D）。'
    ],
    relations: ['mengtian', 'mengtian-solar-b', 'system-power'],
    referenceIds: ['CMSE-OFFICIAL', 'CMSE-20221107'],
    tags: ['太阳翼', '大面积柔性', '发电', '实验舱'],
    modelDimensions: { x: 15.0, y: 0.2, z: 9.2, unit: 'm' }
  },

  'mengtian-solar-b': {
    id: 'mengtian-solar-b',
    parentId: 'mengtian',
    name: '梦天实验舱柔性太阳翼 B',
    englishName: 'Mengtian Flexible Solar Wing B',
    shortName: '太阳翼 B',
    category: '太阳翼',
    module: '梦天',
    selectable: true,
    accuracyLevel: 'A',
    summary: '梦天实验舱另一侧的大面积柔性太阳翼，单翼面积约 138 m²。',
    description: '梦天实验舱另一侧的大面积柔性太阳翼，单翼展开面积约 138 m²，与 A 翼同构、安装方向相对。两翼在轨展开后协同跟踪太阳方位，与核心舱、问天实验舱太阳翼共同构成整站 6 翼能源系统（公开资料表述）。实际发电功率与并网策略公开资料未确认。',
    function: '与 A 翼共同构成梦天主电源，向组合体电网供电。',
    specs: [
      { label: '单翼面积', value: '约 138 m²', accuracyLevel: 'A' },
      { label: '梦天太阳翼数量', value: '2 翼', accuracyLevel: 'A' },
      { label: '展开长度', value: '约 15.0 m', accuracyLevel: 'B', note: '模型取值，官方未公布统一数值' },
      { label: '展开宽度', value: '约 9.2 m', accuracyLevel: 'B', note: '模型取值，官方未公布统一数值' },
      { label: '实际发电功率', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '与 A 翼同构的柔性电池毯与展开桁架。',
      '根部驱动机构完成太阳跟踪与锁定。',
      '展开过程为动画模拟（D）。'
    ],
    relations: ['mengtian', 'mengtian-solar-a', 'system-power'],
    referenceIds: ['CMSE-OFFICIAL', 'CMSE-20221107'],
    tags: ['太阳翼', '大面积柔性', '发电', '实验舱'],
    modelDimensions: { x: 15.0, y: 0.2, z: 9.2, unit: 'm' }
  },

  'system-power': {
    id: 'system-power',
    parentId: 'station',
    name: '能源与配电系统',
    englishName: 'Power and Distribution System',
    shortName: '能源系统',
    category: '系统',
    module: '共享',
    selectable: true,
    accuracyLevel: 'B',
    summary: '由 6 翼太阳翼、储能电池与跨舱配电网组成的整站能源系统。',
    description: '能源与配电系统由三舱 6 块柔性太阳翼、驱动机构、储能电池与配电网络构成，将太阳辐照转换为电能并完成并网、储能与分配。公开资料显示三舱电源具备并网运行能力，可在供电不足时由组合体电网互相支援。实际发电功率、储能容量与配电电压等级公开资料未确认。',
    function: '为整站推进、热控、环控生保、科学载荷与乘员设施提供连续电力，并在阴影期维持能量平衡。',
    specs: [
      { label: '太阳翼总数', value: '6 翼（核心舱 2 翼 + 两实验舱各 2 翼）', accuracyLevel: 'A' },
      { label: '单翼面积', value: '核心舱约 67 m²；实验舱约 138 m²', accuracyLevel: 'A' },
      { label: '并网供电', value: '三舱电源可并网运行（公开资料表述）', accuracyLevel: 'B' },
      { label: '储能方式', value: '蓄电池储能（类型与容量公开资料未确认）', accuracyLevel: 'B' },
      { label: '整站发电功率', value: '公开资料未确认', accuracyLevel: null },
      { label: '配电电压等级', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '能量流路径：太阳翼 → 驱动机构 → 电源控制器 → 并网母线 → 各舱负载（概念示意）。',
      '储能电池组在阴影期放电、光照期充电（概念示意）。',
      '跨舱配电经对接面电缆连接，具体走向未公开（C）。'
    ],
    relations: ['station', 'tianhe', 'wentian', 'mengtian', 'tianhe-solar-a', 'tianhe-solar-b', 'wentian-solar-a', 'wentian-solar-b', 'mengtian-solar-a', 'mengtian-solar-b', 'wentian-berth', 'mengtian-berth'],
    referenceIds: ['CMSE-OFFICIAL', 'CASC-OFFICIAL', 'CNSA-OFFICIAL'],
    tags: ['能源', '太阳翼', '并网供电', '配电'],
    modelDimensions: null
  },

  'system-comm': {
    id: 'system-comm',
    parentId: 'station',
    name: '通信与测控系统',
    englishName: 'Communication and Tracking System',
    shortName: '通信系统',
    category: '系统',
    module: '共享',
    selectable: true,
    accuracyLevel: 'B',
    summary: '整合天地测控、中继、舱内外通信与出舱通信的整站通信体系。',
    description: '通信与测控系统负责空间站与地面测控网、中继卫星之间的天地链路，以及舱内无线网络、舱间通信和出舱活动通信。公开资料显示空间站依托中继卫星提升测控覆盖，实现遥测、视频与载荷数据下传。频段配置、码速率与终端数量公开资料未确认。',
    function: '保障天地遥测遥控、话音视频、载荷数据下传以及舱内外通信联络。',
    specs: [
      { label: '天地链路', value: '地面测控网与中继卫星（公开资料表述）', accuracyLevel: 'B' },
      { label: '舱内网络', value: '支持舱内无线网络', accuracyLevel: 'B' },
      { label: '出舱通信', value: '支持出舱活动通信', accuracyLevel: 'B' },
      { label: '频段与码速率', value: '公开资料未确认', accuracyLevel: null },
      { label: '终端数量与布置', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '舱外通信天线与中继终端构成天地链路前端。',
      '舱内布置无线接入与有线总线网络（C 级示意）。',
      '出舱通信由舱外设备与舱外航天服通信系统配合（概念示意）。'
    ],
    relations: ['station', 'station-antenna', 'tianhe', 'wentian', 'mengtian', 'shenzhou', 'tianzhou'],
    referenceIds: ['CMSE-OFFICIAL', 'CASC-OFFICIAL'],
    tags: ['通信', '测控', '中继卫星', '天地链路'],
    modelDimensions: null
  },

  'system-thermal': {
    id: 'system-thermal',
    parentId: 'station',
    name: '热控系统',
    englishName: 'Thermal Control System',
    shortName: '热控系统',
    category: '系统',
    module: '共享',
    selectable: true,
    accuracyLevel: 'B',
    summary: '以流体回路、舱外辐射器与多层隔热材料维持整站热平衡。',
    description: '热控系统通过主动流体回路、舱外辐射器、热管与多层隔热材料等手段，将舱内设备与太阳辐照产生的热量排散到空间，并维持舱内温度环境。三舱热控系统协同工作，为乘员与载荷提供温控条件。散热能力、回路工质与辐射器面积公开资料未确认。',
    function: '维持舱内温度与设备工作温度，排散废热，保障乘员与载荷的热环境。',
    specs: [
      { label: '主动热控', value: '流体回路（公开资料表述）', accuracyLevel: 'B' },
      { label: '散热方式', value: '舱外辐射器（公开资料表述）', accuracyLevel: 'B' },
      { label: '隔热', value: '多层隔热材料（MLI，公开影像近似）', accuracyLevel: 'B' },
      { label: '散热能力', value: '公开资料未确认', accuracyLevel: null },
      { label: '回路工质', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '舱内设备安装板与流体回路换热（概念示意）。',
      '热量经舱外辐射器向空间排散（概念示意）。',
      '外部多层隔热毯与表面涂层为公开影像近似（B/C）。'
    ],
    relations: ['station', 'tianhe', 'wentian', 'mengtian', 'tianhe-resource', 'wentian-resource', 'mengtian-resource', 'station-body'],
    referenceIds: ['CMSE-OFFICIAL', 'CASC-OFFICIAL'],
    tags: ['热控', '辐射器', '流体回路', '隔热'],
    modelDimensions: null
  },

  'system-docking': {
    id: 'system-docking',
    parentId: 'station',
    name: '交会对接与停泊系统',
    englishName: 'Rendezvous, Docking and Berthing System',
    shortName: '对接系统',
    category: '系统',
    module: '共享',
    selectable: true,
    accuracyLevel: 'A',
    summary: '统筹三个对接口、两个侧向停泊口与转位机构的对接体系。',
    description: '交会对接与停泊系统由各舱段的对接口、对接机构、测量敏感器与转位机构组成，承担来访航天器交会对接、长期停靠与实验舱转位任务。空间站配置前向、后向、径向三个对接口和两个侧向停泊口（公开资料表述），可支持多艘飞船同时在轨停靠。对接机构型号、捕获包络与测量方案公开资料未确认。',
    function: '完成来访飞船的交会对接与停靠，支持实验舱转位与多飞行器同时在轨停靠。',
    specs: [
      { label: '对接口', value: '3 个：前向、后向、径向', accuracyLevel: 'A' },
      { label: '侧向停泊口', value: '2 个', accuracyLevel: 'A' },
      { label: '对接机构', value: '周边式对接机构（公开资料常见表述）', accuracyLevel: 'B' },
      { label: '转位能力', value: '支持实验舱由前向到侧向的平面转位', accuracyLevel: 'A' },
      { label: '捕获包络与测量方案', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '对接机构由导向、捕获、锁紧、密封与电气连接等部分组成（概念示意）。',
      '测量敏感器布置于对接口周围，为近距离导引提供观测。',
      '转位机构完成实验舱由前向到侧向的平面转移。'
    ],
    relations: ['station', 'tianhe-front-dock', 'tianhe-rear-dock', 'tianhe-radial-dock', 'wentian-berth', 'mengtian-berth', 'shenzhou', 'tianzhou', 'system-gnc'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC', 'CMSE-20221107'],
    tags: ['交会对接', '对接口', '停泊', '转位'],
    modelDimensions: null
  },

  'system-gnc': {
    id: 'system-gnc',
    parentId: 'station',
    name: '制导、导航与控制系统',
    englishName: 'Guidance, Navigation and Control System',
    shortName: 'GNC 系统',
    category: '系统',
    module: '共享',
    selectable: true,
    accuracyLevel: 'B',
    summary: '负责组合体姿态确定、轨道维持与交会对接导引的控制系统。',
    description: '制导、导航与控制系统通过惯性测量、光学敏感器与推进执行机构实现组合体姿态确定与稳定，承担轨道维持、交会对接导引与姿态机动等任务。公开资料提及空间站采用电推进技术辅助轨道维持，以降低推进剂消耗；具体配置、推力器数量与控制力矩陀螺等细节公开资料未确认。',
    function: '维持组合体姿态与轨道，为交会对接、转位与长期飞行提供控制保障。',
    specs: [
      { label: '主要功能', value: '姿态确定与控制、轨道维持、交会对接导引', accuracyLevel: 'B' },
      { label: '执行机构', value: '化学推进与电推进（公开资料表述，具体配置未确认）', accuracyLevel: 'B' },
      { label: '敏感器', value: '惯性器件与光学敏感器（公开资料近似）', accuracyLevel: 'B' },
      { label: '推力器数量', value: '公开资料未确认', accuracyLevel: null },
      { label: '控制力矩陀螺配置', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '测量链路：惯性器件与光学敏感器 → 控制计算机（概念示意）。',
      '执行链路：推进系统与力矩执行机构 → 组合体姿态与轨道。',
      '设备布局与冗余架构为概念示意（C）。'
    ],
    relations: ['station', 'tianhe', 'tianhe-resource', 'shenzhou', 'tianzhou', 'system-docking', 'tianhe-radial-dock'],
    referenceIds: ['CMSE-OFFICIAL', 'CASC-OFFICIAL'],
    tags: ['GNC', '姿态控制', '轨道维持', '电推进'],
    modelDimensions: null
  },

  'system-life': {
    id: 'system-life',
    parentId: 'station',
    name: '环境控制与生命保障系统',
    englishName: 'Environmental Control and Life Support System',
    shortName: '环控生保',
    category: '系统',
    module: '共享',
    selectable: true,
    accuracyLevel: 'B',
    summary: '维持舱内大气、温湿度与饮用水循环，保障乘组长期驻留。',
    description: '环境控制与生命保障系统负责舱内大气压力与成分控制、温湿度调节、饮用水与卫生设施支持以及废弃物管理，是航天员长期在轨驻留的基础。公开资料显示系统采用物理化学再生技术，实现部分水与氧的循环利用；具体循环利用率、设备型号与冗余配置公开资料未确认。',
    function: '为乘组提供可呼吸大气、适宜温湿度、饮用水与生活卫生条件，并处理舱内废弃物。',
    specs: [
      { label: '大气控制', value: '压力与氧氮成分调节（公开资料表述）', accuracyLevel: 'B' },
      { label: '温湿度控制', value: '支持舱内温湿度调节', accuracyLevel: 'B' },
      { label: '水循环', value: '物理化学再生（公开资料表述）', accuracyLevel: 'B' },
      { label: '循环利用率', value: '公开资料未确认', accuracyLevel: null },
      { label: '设备型号与冗余配置', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '舱内设备机柜集中布置制氧、除碳、除湿与净水设备（C 级示意）。',
      '流体与通风管路沿舱壁铺设（C）。',
      '与热控、电源系统存在交叉接口（B 级概念关系）。'
    ],
    relations: ['station', 'tianhe-living', 'wentian-working', 'wentian-airlock', 'shenzhou', 'system-thermal'],
    referenceIds: ['CMSE-OFFICIAL', 'SCIO-WP-2021', 'CNSA-OFFICIAL'],
    tags: ['环控生保', '大气控制', '水循环', '生命保障'],
    modelDimensions: null
  },

  'shenzhou': {
    id: 'shenzhou',
    parentId: 'station',
    name: '神舟载人飞船',
    englishName: 'Shenzhou Crewed Spacecraft',
    shortName: '神舟',
    category: '飞船',
    module: '停靠',
    selectable: true,
    accuracyLevel: 'A',
    summary: '三舱构型载人飞船，承担航天员天地往返与在轨应急救生。',
    description: '神舟载人飞船由轨道舱、返回舱与推进舱组成，经长征二号F 运载火箭发射，与空间站前向或径向端口对接。飞船停靠期间可作为乘组生活扩展空间与在轨应急救生艇；任务结束时返回舱携乘组返回地面。飞船具体尺寸与质量公开资料未作统一披露，模型比例依据公开影像近似。',
    function: '运送与返回航天员，提供停靠期间的生活扩展、应急救生与部分物资运输能力。',
    specs: [
      { label: '舱段组成', value: '轨道舱 + 返回舱 + 推进舱', accuracyLevel: 'A' },
      { label: '运载火箭', value: '长征二号F（公开资料）', accuracyLevel: 'B' },
      { label: '对接方式', value: '前向轴向或径向对接', accuracyLevel: 'A' },
      { label: '主要尺寸', value: '公开资料常见数据：全长约 9 m，最大直径约 2.8 m', accuracyLevel: 'B', note: '公开报道常见数据，非本项目核验' },
      { label: '在轨质量', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '轨道舱：对接机构与在轨生活扩展空间。',
      '返回舱：乘组座舱，任务结束时再入返回。',
      '推进舱：推进、电源与部分资源设备。',
      '外形比例依据公开影像近似（B）。'
    ],
    relations: ['station', 'tianhe-front-dock', 'tianhe-radial-dock', 'system-docking', 'system-life', 'system-comm'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-OFFICIAL'],
    tags: ['载人飞船', '天地往返', '应急救生', '神舟'],
    modelDimensions: { x: 9.0, y: 2.8, z: 2.8, unit: 'm' }
  },

  'tianzhou': {
    id: 'tianzhou',
    parentId: 'station',
    name: '天舟货运飞船',
    englishName: 'Tianzhou Cargo Spacecraft',
    shortName: '天舟',
    category: '飞船',
    module: '停靠',
    selectable: true,
    accuracyLevel: 'A',
    summary: '货运飞船，承担推进剂、货物与实验载荷补给及在轨推进支持。',
    description: '天舟货运飞船经长征七号运载火箭发射，与空间站后向端口对接，为空间站补给推进剂、航天员消耗品、实验载荷与维修备件。货运飞船停靠期间可实施推进剂补加与轨道维持支持，任务结束后从后向端口分离并再入。具体货运能力与尺寸公开资料未作统一披露。',
    function: '补给推进剂、货物与载荷，支持组合体轨道维持，并在必要时作为临时扩展空间。',
    specs: [
      { label: '运载火箭', value: '长征七号（公开资料）', accuracyLevel: 'B' },
      { label: '对接端口', value: '后向对接口', accuracyLevel: 'A' },
      { label: '补给内容', value: '推进剂、货物与实验载荷', accuracyLevel: 'A' },
      { label: '主要尺寸', value: '公开资料常见数据：全长约 10.6 m，最大直径约 3.35 m', accuracyLevel: 'B', note: '公开报道常见数据，非本项目核验' },
      { label: '货运能力', value: '公开资料未确认（各任务表述不同）', accuracyLevel: null }
    ],
    structure: [
      '货运舱段与推进舱段组合构型（公开影像近似）。',
      '尾部对接机构与推进剂补加接口。',
      '太阳翼为在轨飞行与停靠提供电力（尺寸与数量公开资料近似）。'
    ],
    relations: ['station', 'tianhe-rear-dock', 'system-docking', 'system-gnc', 'system-comm'],
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-OFFICIAL'],
    tags: ['货运飞船', '物资补给', '推进剂补加', '天舟'],
    modelDimensions: { x: 10.6, y: 3.35, z: 3.35, unit: 'm' }
  },

  'station-body': {
    id: 'station-body',
    parentId: 'station',
    name: '舱体共用结构与外部设备',
    englishName: 'Shared Structure and External Equipment',
    shortName: '舱体结构',
    category: '结构',
    module: '共享',
    selectable: true,
    accuracyLevel: 'B',
    summary: '三舱对接形成的刚性组合体及其外部设备安装接口。',
    description: '舱体共用结构指三舱通过对接口刚性连接形成的组合体主结构，以及舱外设备安装面、目标适配器与外部管路等共用外部设施。机械臂爬行、舱外载荷安装与出舱作业均依赖这些外部接口。结构参数、目标适配器数量与安装位置公开资料未确认。',
    function: '构成空间站组合体承力主体，为机械臂、舱外载荷与出舱作业提供安装与操作基础。',
    specs: [
      { label: '结构形式', value: '三舱刚性连接组合体', accuracyLevel: 'A' },
      { label: '外部适配器', value: '支持机械臂爬行与载荷安装（数量未确认）', accuracyLevel: 'B' },
      { label: '具体结构参数', value: '公开资料未确认', accuracyLevel: null }
    ],
    structure: [
      '三舱通过对接机构形成刚性连接（概念示意）。',
      '舱外布置目标适配器、把手与固定点（C 级示意）。',
      '外部管路与线缆沿舱体表面布置（C）。'
    ],
    relations: ['station', 'tianhe', 'wentian', 'mengtian', 'tianhe-big-arm', 'system-thermal'],
    referenceIds: ['CMSE-OFFICIAL', 'CASC-OFFICIAL'],
    tags: ['组合体结构', '外部设备', '目标适配器', '舱外作业'],
    modelDimensions: null
  },

  'station-antenna': {
    id: 'station-antenna',
    parentId: 'station',
    name: '舱外通信天线',
    englishName: 'External Communication Antenna',
    shortName: '通信天线',
    category: '系统',
    module: '共享',
    selectable: true,
    accuracyLevel: 'B',
    summary: '舱外天线与中继终端共同构成天地通信链路前端。',
    description: '舱外通信天线分布于各舱外部，与中继终端、测控设备配合建立与地面测控网及中继卫星的天地链路，承担遥测遥控、话音视频与载荷数据下传。天线数量、频段与安装位置公开资料未确认；模型中的天线位置为公开影像近似。',
    function: '建立天地通信链路，保障遥测遥控、话音视频与载荷数据下传。',
    specs: [
      { label: '功能', value: '天地链路收发', accuracyLevel: 'B' },
      { label: '天线数量与频段', value: '公开资料未确认', accuracyLevel: null },
      { label: '安装位置', value: '公开影像近似（B）', accuracyLevel: 'B' }
    ],
    structure: [
      '天线由反射面或振子、馈电与指向机构组成（概念示意）。',
      '与舱内中继终端经舱壁馈通连接（C）。',
      '安装位置与外形为公开影像近似（B）。'
    ],
    relations: ['station', 'system-comm', 'tianhe', 'wentian', 'mengtian'],
    referenceIds: ['CMSE-OFFICIAL', 'CASC-OFFICIAL'],
    tags: ['通信天线', '天地链路', '中继终端', '测控'],
    modelDimensions: null
  }
};

/**
 * 结构浏览器树。selectableId 必须对应 COMPONENTS 中的真实部件 id；
 * 分组节点（无 selectableId）仅用于层级组织。图标的 token 取值：
 * module | node | wing | arm | port | hatch | lab | platform | system | craft | equipment
 */
export const STRUCTURE_TREE = [
  {
    id: 'station-root',
    name: '空间站组合体总览',
    icon: 'module',
    selectableId: 'station',
    children: [
      {
        id: 'group-tianhe',
        name: '天和核心舱',
        icon: 'module',
        selectableId: 'tianhe',
        children: [
          {
            id: 'node-tianhe-node',
            name: '节点舱',
            icon: 'node',
            selectableId: 'tianhe-node',
            children: [
              { id: 'node-tianhe-front-dock', name: '前向对接口', icon: 'port', selectableId: 'tianhe-front-dock' },
              { id: 'node-tianhe-radial-dock', name: '径向对接口', icon: 'port', selectableId: 'tianhe-radial-dock' }
            ]
          },
          { id: 'node-tianhe-living', name: '生活与工作段', icon: 'module', selectableId: 'tianhe-living' },
          {
            id: 'node-tianhe-resource',
            name: '资源舱',
            icon: 'equipment',
            selectableId: 'tianhe-resource',
            children: [
              { id: 'node-tianhe-rear-dock', name: '后向对接口', icon: 'port', selectableId: 'tianhe-rear-dock' }
            ]
          },
          { id: 'node-tianhe-big-arm', name: '大型机械臂', icon: 'arm', selectableId: 'tianhe-big-arm' },
          {
            id: 'group-tianhe-solar',
            name: '柔性太阳翼（2 翼）',
            icon: 'wing',
            children: [
              { id: 'node-tianhe-solar-a', name: '太阳翼 A（左翼）', icon: 'wing', selectableId: 'tianhe-solar-a' },
              { id: 'node-tianhe-solar-b', name: '太阳翼 B（右翼）', icon: 'wing', selectableId: 'tianhe-solar-b' }
            ]
          }
        ]
      },
      {
        id: 'group-wentian',
        name: '问天实验舱',
        icon: 'lab',
        selectableId: 'wentian',
        children: [
          { id: 'node-wentian-working', name: '工作舱', icon: 'lab', selectableId: 'wentian-working' },
          { id: 'node-wentian-airlock', name: '气闸舱（主气闸）', icon: 'hatch', selectableId: 'wentian-airlock' },
          { id: 'node-wentian-resource', name: '资源舱', icon: 'equipment', selectableId: 'wentian-resource' },
          { id: 'node-wentian-berth', name: '侧向停泊接口', icon: 'port', selectableId: 'wentian-berth' },
          { id: 'node-wentian-small-arm', name: '小型机械臂', icon: 'arm', selectableId: 'wentian-small-arm' },
          { id: 'node-wentian-exp-platform', name: '舱外载荷平台', icon: 'platform', selectableId: 'wentian-exp-platform' },
          {
            id: 'group-wentian-solar',
            name: '柔性太阳翼（2 翼）',
            icon: 'wing',
            children: [
              { id: 'node-wentian-solar-a', name: '太阳翼 A', icon: 'wing', selectableId: 'wentian-solar-a' },
              { id: 'node-wentian-solar-b', name: '太阳翼 B', icon: 'wing', selectableId: 'wentian-solar-b' }
            ]
          }
        ]
      },
      {
        id: 'group-mengtian',
        name: '梦天实验舱',
        icon: 'lab',
        selectableId: 'mengtian',
        children: [
          { id: 'node-mengtian-working', name: '工作舱', icon: 'lab', selectableId: 'mengtian-working' },
          { id: 'node-mengtian-cargo-airlock', name: '货物气闸舱', icon: 'hatch', selectableId: 'mengtian-cargo-airlock' },
          { id: 'node-mengtian-payload', name: '载荷舱', icon: 'module', selectableId: 'mengtian-payload' },
          { id: 'node-mengtian-exp-platform', name: '舱外载荷实验平台', icon: 'platform', selectableId: 'mengtian-exp-platform' },
          { id: 'node-mengtian-resource', name: '资源舱', icon: 'equipment', selectableId: 'mengtian-resource' },
          { id: 'node-mengtian-berth', name: '侧向停泊接口', icon: 'port', selectableId: 'mengtian-berth' },
          {
            id: 'group-mengtian-solar',
            name: '柔性太阳翼（2 翼）',
            icon: 'wing',
            children: [
              { id: 'node-mengtian-solar-a', name: '太阳翼 A', icon: 'wing', selectableId: 'mengtian-solar-a' },
              { id: 'node-mengtian-solar-b', name: '太阳翼 B', icon: 'wing', selectableId: 'mengtian-solar-b' }
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'group-systems',
    name: '共享系统',
    icon: 'system',
    children: [
      { id: 'node-system-power', name: '能源与配电', icon: 'system', selectableId: 'system-power' },
      { id: 'node-system-comm', name: '通信与测控', icon: 'system', selectableId: 'system-comm' },
      { id: 'node-system-thermal', name: '热控', icon: 'system', selectableId: 'system-thermal' },
      { id: 'node-system-docking', name: '交会对接与停泊', icon: 'system', selectableId: 'system-docking' },
      { id: 'node-system-gnc', name: '制导、导航与控制', icon: 'system', selectableId: 'system-gnc' },
      { id: 'node-system-life', name: '环境控制与生命保障', icon: 'system', selectableId: 'system-life' },
      { id: 'node-station-body', name: '舱体共用结构', icon: 'module', selectableId: 'station-body' },
      { id: 'node-station-antenna', name: '舱外通信天线', icon: 'equipment', selectableId: 'station-antenna' }
    ]
  },
  {
    id: 'group-visiting',
    name: '停靠航天器',
    icon: 'craft',
    children: [
      { id: 'node-shenzhou', name: '神舟载人飞船', icon: 'craft', selectableId: 'shenzhou' },
      { id: 'node-tianzhou', name: '天舟货运飞船', icon: 'craft', selectableId: 'tianzhou' }
    ]
  }
];

/**
 * 六个系统视图，用于三维场景中的概念高亮。
 * componentIds 均为 COMPONENTS 中真实存在的部件；高亮不代表真实的管路/电路走向。
 */
export const SYSTEM_VIEWS = {
  power: {
    id: 'power',
    name: '能源',
    englishName: 'POWER',
    color: '#FFD166',
    description: '太阳翼—驱动机构—储能—跨舱配电网的概念高亮路径。',
    componentIds: ['system-power', 'tianhe-solar-a', 'tianhe-solar-b', 'wentian-solar-a', 'wentian-solar-b', 'mengtian-solar-a', 'mengtian-solar-b', 'tianhe', 'wentian', 'mengtian'],
    note: '概念高亮；真实配电走向与电压等级公开资料未确认。'
  },
  comm: {
    id: 'comm',
    name: '通信',
    englishName: 'COMM',
    color: '#37C8FF',
    description: '天地链路与舱外天线、来访飞船通信终端的概念高亮。',
    componentIds: ['system-comm', 'station-antenna', 'tianhe', 'shenzhou', 'tianzhou'],
    note: '概念高亮；频段、终端数量与天线指向公开资料未确认。'
  },
  thermal: {
    id: 'thermal',
    name: '热控',
    englishName: 'THERMAL',
    color: '#FF8B6A',
    description: '舱内流体回路与舱外辐射器、隔热层的热排散概念高亮。',
    componentIds: ['system-thermal', 'tianhe-resource', 'wentian-resource', 'mengtian-resource', 'station-body'],
    note: '概念高亮；散热能力、回路工质与辐射器面积公开资料未确认。'
  },
  docking: {
    id: 'docking',
    name: '对接',
    englishName: 'DOCKING',
    color: '#46D7A1',
    description: '前向、后向、径向对接口与两个侧向停泊口的对接体系高亮。',
    componentIds: ['system-docking', 'tianhe-front-dock', 'tianhe-rear-dock', 'tianhe-radial-dock', 'wentian-berth', 'mengtian-berth', 'shenzhou', 'tianzhou'],
    note: '接口位置为 A 级公开事实；对接机构内部结构与捕获包络为示意。'
  },
  arm: {
    id: 'arm',
    name: '机械臂',
    englishName: 'ROBOTIC ARM',
    color: '#FFB95E',
    description: '大型机械臂与小型机械臂的关节链与作业范围概念高亮。',
    componentIds: ['tianhe-big-arm', 'wentian-small-arm', 'tianhe', 'wentian'],
    note: '高亮覆盖机械臂及其宿主舱段；关节运动时序为动画模拟（D）。'
  },
  life: {
    id: 'life',
    name: '生命保障',
    englishName: 'LIFE SUPPORT',
    color: '#8FB1CD',
    description: '环控生保设备、生活舱段与气闸的概念高亮。',
    componentIds: ['system-life', 'tianhe-living', 'wentian-working', 'wentian-airlock', 'tianhe'],
    note: '概念高亮；设备型号、循环利用率与冗余配置公开资料未确认。'
  }
};

/**
 * 总览数据卡片。value/unit/label 用于数字展示；note 说明推算或近似口径。
 */
export const OVERVIEW_STATS = [
  { value: '3', unit: '舱段', label: '“T”字基本构型', accuracyLevel: 'A', note: '2022-11-03 完成' },
  { value: '6', unit: '翼', label: '柔性太阳翼', accuracyLevel: 'A', note: '三舱各 2 翼' },
  { value: '16.6', unit: 'm', label: '天和核心舱轴向长度', accuracyLevel: 'A' },
  { value: '17.9', unit: 'm', label: '问天 / 梦天实验舱长度', accuracyLevel: 'A' },
  { value: '4.2', unit: 'm', label: '舱段最大直径', accuracyLevel: 'A' },
  { value: '10.2', unit: 'm', label: '大型机械臂主臂长度', accuracyLevel: 'A' },
  { value: '41.5', unit: '°', label: '轨道倾角（约）', accuracyLevel: 'A' },
  { value: '约 400', unit: 'km', label: '轨道高度（约 340–450 km）', accuracyLevel: 'A' },
  { value: '约 92', unit: 'min', label: '轨道周期（约）', accuracyLevel: 'A' },
  { value: '约 686', unit: 'm²', label: '太阳翼总面积', accuracyLevel: 'B', note: '按公开单翼面积推算：2 × 67 + 4 × 138' }
];

/**
 * 建造历程（6 个阶段）。日期为公开任务节点；三维装配动画为科普示意，
 * 非真实轨道动力学与遥测数据，详见各阶段 description 中的说明。
 */
export const TIMELINE_STAGES = [
  {
    index: 0,
    date: '2021.04.29',
    title: '天和核心舱入轨',
    description: '2021 年 4 月 29 日，长征五号B 运载火箭将天和核心舱送入预定轨道，中国空间站建造全面展开。装配动画中的入轨过程为科普示意。',
    accuracyLevel: 'A',
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-OFFICIAL']
  },
  {
    index: 1,
    date: '2022.07.24',
    title: '问天实验舱发射入轨（示意）',
    description: '2022 年 7 月 24 日，问天实验舱发射入轨。动画中的发射与入轨过程为科普示意，非真实弹道与轨道参数。',
    accuracyLevel: 'A',
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC']
  },
  {
    index: 2,
    date: '2022.07.25',
    title: '问天与天和交会对接（示意）',
    description: '2022 年 7 月 25 日，问天实验舱与天和核心舱前向端口完成交会对接。动画中的接近路径、相对速度与姿态为示意。',
    accuracyLevel: 'A',
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC']
  },
  {
    index: 3,
    date: '2022.09.30',
    title: '问天转位至侧向停泊口（示意）',
    description: '2022 年 9 月 30 日，问天实验舱由前向端口转位至节点舱侧向停泊口。转位过程的角速度与轨迹为科普示意。',
    accuracyLevel: 'A',
    referenceIds: ['CMSE-OFFICIAL', 'CMSE-20221107']
  },
  {
    index: 4,
    date: '2022.10.31',
    title: '梦天实验舱发射并对接（示意）',
    description: '2022 年 10 月 31 日，梦天实验舱发射入轨并实施与空间站的对接。动画中的发射、变轨与对接时序为示意，非实时遥测数据。',
    accuracyLevel: 'A',
    referenceIds: ['CMSE-OFFICIAL', 'CMSE-20221107']
  },
  {
    index: 5,
    date: '2022.11.03',
    title: '梦天转位，T 字基本构型完成',
    description: '2022 年 11 月 3 日，梦天实验舱转位至另一侧停泊口，空间站“T”字基本构型完成。示意动画不表示真实轨道机动参数。',
    accuracyLevel: 'A',
    referenceIds: ['CMSE-OFFICIAL', 'CMSE-20221107']
  }
];

/**
 * 三舱比较数据。仅覆盖公开资料可确认或可近似的内容；
 * 未知项以“公开资料未确认”标注，不以估计值填充。
 */
export const COMPARISONS = [
  {
    id: 'tianhe',
    name: '天和核心舱',
    englishName: 'Tianhe Core Module',
    fields: {
      length: { label: '轴向长度', value: '约 16.6 m', accuracyLevel: 'A' },
      diameter: { label: '最大直径', value: '约 4.2 m', accuracyLevel: 'A' },
      launch: { label: '发射时间', value: '2021-04-29', accuracyLevel: 'A' },
      composition: { label: '舱段组成', value: '节点舱、小柱段、大柱段、资源舱', accuracyLevel: 'A' },
      function: { label: '主要职能', value: '组合体统一控制、交会对接与停泊接口、乘组生活支持、大型机械臂', accuracyLevel: 'A' },
      solar: { label: '柔性太阳翼', value: '2 翼 × 约 67 m²', accuracyLevel: 'A' },
      ports: { label: '对接/停泊接口', value: '前向、后向、径向对接口 + 2 个侧向停泊口', accuracyLevel: 'A' },
      arm: { label: '机械臂', value: '大型机械臂（约 10.2 m，7 自由度，约 25 t）', accuracyLevel: 'A' },
      sleep: { label: '睡眠区', value: '3 个', accuracyLevel: 'B' },
      mass: { label: '发射质量', value: '公开资料未确认', accuracyLevel: null },
      interior: { label: '舱内布局', value: '公开资料未确认（科普示意）', accuracyLevel: null }
    },
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC']
  },
  {
    id: 'wentian',
    name: '问天实验舱',
    englishName: 'Wentian Laboratory Module',
    fields: {
      length: { label: '轴向长度', value: '约 17.9 m', accuracyLevel: 'A' },
      diameter: { label: '最大直径', value: '约 4.2 m', accuracyLevel: 'A' },
      launch: { label: '发射时间', value: '2022-07-24', accuracyLevel: 'A' },
      docking: { label: '对接与转位', value: '2022-07-25 前向对接；2022-09-30 转位至侧向停泊口', accuracyLevel: 'A' },
      composition: { label: '舱段组成', value: '工作舱、气闸舱、资源舱', accuracyLevel: 'A' },
      function: { label: '主要职能', value: '生命科学等实验、主气闸出舱、生活泊位与关键功能备份', accuracyLevel: 'B' },
      solar: { label: '柔性太阳翼', value: '2 翼 × 约 138 m²', accuracyLevel: 'A' },
      arm: { label: '机械臂', value: '小型机械臂（约 5 m，7 自由度，约 3 t）', accuracyLevel: 'A' },
      sleep: { label: '睡眠区', value: '3 个（卫生区 1 个）', accuracyLevel: 'B' },
      mass: { label: '发射质量', value: '公开资料未确认', accuracyLevel: null },
      interior: { label: '实验机柜数量与布局', value: '公开资料未确认（科普示意）', accuracyLevel: null }
    },
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC']
  },
  {
    id: 'mengtian',
    name: '梦天实验舱',
    englishName: 'Mengtian Laboratory Module',
    fields: {
      length: { label: '轴向长度', value: '约 17.9 m', accuracyLevel: 'A' },
      diameter: { label: '最大直径', value: '约 4.2 m', accuracyLevel: 'A' },
      launch: { label: '发射时间', value: '2022-10-31', accuracyLevel: 'A' },
      docking: { label: '对接与转位', value: '发射后对接；2022-11-03 转位完成', accuracyLevel: 'A' },
      composition: { label: '舱段组成', value: '工作舱、载荷舱、资源舱', accuracyLevel: 'A' },
      function: { label: '主要职能', value: '微重力物理、材料与燃烧等实验，货物气闸与舱外实验平台', accuracyLevel: 'B' },
      solar: { label: '柔性太阳翼', value: '2 翼 × 约 138 m²', accuracyLevel: 'A' },
      airlock: { label: '货物气闸舱', value: '1 个', accuracyLevel: 'A' },
      arm: { label: '机械臂', value: '公开资料未确认（可接受大型机械臂作业支持）', accuracyLevel: null },
      mass: { label: '发射质量', value: '公开资料未确认', accuracyLevel: null },
      interior: { label: '实验机柜数量与布局', value: '公开资料未确认（科普示意）', accuracyLevel: null }
    },
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-CSS-TOPIC', 'CMSE-20221107']
  }
];
