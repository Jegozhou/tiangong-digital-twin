/**
 * references.js — 公开资料来源登记表
 *
 * 本文件仅登记可公开引用的机构与页面，不包含任何内部资料、遥测或专有数据。
 * 编制原则：
 *  1. 优先使用中国载人航天工程网（CMSE）与中国国家航天局（CNSA）等官方机构入口；
 *  2. 项目资料提供的深链（见 docs/DATA_SCHEMA.md）原样记录，但本环境无法核验页面
 *     标题，因此标题采用"发布页面/专题页面"等泛称，不虚构文章标题或文章编号；
 *  3. 无法访问核验的条目在 note 中明确标注，正文与研究说明中按"公开资料"口径引用。
 *
 * 所有 URL 均为公开机构地址；若链接失效，应以机构站点内的对应栏目为准。
 */

export const REFERENCES = {
  'CMSE-OFFICIAL': {
    id: 'CMSE-OFFICIAL',
    title: '中国载人航天工程官方网站',
    publisher: '中国载人航天工程办公室（CMSE）',
    year: '2023',
    type: 'official',
    url: 'https://www.cmse.gov.cn/',
    note: '载人航天工程官方门户，用于空间站建造、交会对接、舱段转位等任务事实的总体来源；具体文章以站内发布为准。'
  },
  'CNSA-OFFICIAL': {
    id: 'CNSA-OFFICIAL',
    title: '中国国家航天局官方网站',
    publisher: '中国国家航天局（CNSA）',
    year: '2023',
    type: 'official',
    url: 'https://www.cnsa.gov.cn/',
    note: '国家航天局官方门户，用于工程总体背景与运载火箭任务背景。本环境未能访问核验，仅作为机构入口引用。'
  },
  'CNSA-CSS-TOPIC': {
    id: 'CNSA-CSS-TOPIC',
    title: '中国国家航天局网站 中国空间站专题页面（项目资料提供链接）',
    publisher: '中国国家航天局（CNSA）',
    year: '2023',
    type: 'official',
    url: 'https://www.cnsa.gov.cn/n6758823/n6758838/c10087703/content.html',
    note: '链接由项目资料提供；本环境无法访问，未能核验页面具体标题。此处按"官方专题页面"泛称引用，不虚构文章标题与编号。'
  },
  'CMSE-20230117': {
    id: 'CMSE-20230117',
    title: '中国载人航天工程网 2023 年 1 月发布页面（项目资料提供链接）',
    publisher: '中国载人航天工程办公室（CMSE）',
    year: '2023',
    type: 'official',
    url: 'https://www.cmse.gov.cn/hdjl/bszjhd/bjzl/202301/t20230117_52275.html',
    note: '链接由项目资料提供；本环境无法访问，未能核验页面具体标题。按官方发布页面泛称引用，不作为具体文章标题依据。'
  },
  'CMSE-20221107': {
    id: 'CMSE-20221107',
    title: '中国载人航天工程网 2022 年 11 月发布页面（项目资料提供链接）',
    publisher: '中国载人航天工程办公室（CMSE）',
    year: '2022',
    type: 'official',
    url: 'https://www.cmse.gov.cn/xwzx/202211/t20221107_51357.html',
    note: '链接由项目资料提供，对应空间站"T"字基本构型完成前后的公开报道时段；本环境无法访问，页面标题未经核验。'
  },
  'SCIO-WP-2021': {
    id: 'SCIO-WP-2021',
    title: '《2021 中国的航天》白皮书',
    publisher: '中华人民共和国国务院新闻办公室',
    year: '2022',
    type: 'official',
    url: 'http://www.scio.gov.cn/',
    note: '官方公开出版物，用于载人航天与空间站工程的总体政策背景。此处登记机构门户链接，具体发布页链接未核验。'
  },
  'CASC-OFFICIAL': {
    id: 'CASC-OFFICIAL',
    title: '中国航天科技集团有限公司官方网站',
    publisher: '中国航天科技集团有限公司（CASC）',
    year: '2023',
    type: 'official',
    url: 'https://www.spacechina.com/',
    note: '空间站舱段与主要分系统研制单位所属集团的门户网站，用于工程体系与研制分工背景；本环境未核验访问。'
  }
};

/**
 * 供 UI 分组或"资料来源"面板使用的来源分组。
 * 仅作展示归类，不影响任何技术结论。
 */
export const SOURCE_GROUPS = [
  {
    id: 'official-portals',
    name: '官方机构门户',
    description: '工程主管机构与研制集团的官方入口，用于总体性、节点性事实。',
    referenceIds: ['CMSE-OFFICIAL', 'CNSA-OFFICIAL', 'CASC-OFFICIAL']
  },
  {
    id: 'mission-pages',
    name: '官方发布页面（项目资料提供）',
    description: '由项目资料提供的官方发布深链，本环境未能核验页面标题，按泛称引用。',
    referenceIds: ['CNSA-CSS-TOPIC', 'CMSE-20221107', 'CMSE-20230117']
  },
  {
    id: 'publications',
    name: '公开出版物',
    description: '政府白皮书等公开出版物，用于工程背景与总体表述。',
    referenceIds: ['SCIO-WP-2021']
  }
];
