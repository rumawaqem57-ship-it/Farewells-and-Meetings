export interface ArchiveTrait {
  /** 卡头小标签，如「日常」「习惯」 */
  label: string;
  /** 卡头标题 */
  title: string;
  /** 卡面正文，一两句话，写玩家看得见的东西 */
  body: string;
}

export interface ArchiveMember {
  id: string;
  name: string;
  romaji: string;
  title: string;
  favor: number;
  gender: string;
  age: string;
  birthday: string;
  hobby: string;
  desc: string;
  tags: string[];
  color: string;
  initial: string;
  /* ---- 状态面板（V4）新增，全部可选：缺字段时对应区块不渲染 ---- */
  /** 立绘左下角的大字角标，不写则取 romaji 第一段 */
  codename?: string;
  /** 状态页两张日常卡 */
  traits?: ArchiveTrait[];
  /** 关系页三行 */
  bondLines?: string[];
}

/**
 * 角色档案数据。
 *
 * 视角铁律：这个面板是**玩家看得见的东西**，不是设定集。
 * 凡是「舌尖／抑制药／理智值／失控」这类会暴露恋喰身份的条目，一律不进档案；
 * 只写外人观察得到的表层信息，暗示最多留到「她说话总留一半」这一档。
 */
export const ARCHIVE_MEMBERS: ArchiveMember[] = [
  {
    id: 'koi',
    name: '恋喰少女',
    romaji: 'KOIBAMI',
    title: '她 · 说不清的关系',
    favor: 50,
    gender: '女',
    age: '不详',
    birthday: '不详',
    hobby: '听你说废话',
    desc: '住在附近的一个女孩。说话声音不大，习惯先听别人说完；她说自己记性很好，好到有点不像话。',
    tags: ['安静', '记性好', '怕冷', '常来'],
    color: '#c8503f',
    initial: '喰',
    codename: 'KOIBAMI',
    traits: [
      {
        label: '日常',
        title: '话少',
        body: '她不太主动开口，但你说什么她都接得住。',
      },
      {
        label: '习惯',
        title: '先听',
        body: '一群人说话时她总是最后一个开口，像在心里记着什么。',
      },
    ],
    bondLines: ['住在这附近 · 常遇见', '她说的话总留一半', '你随口提过的小事，她都记得'],
  },
  {
    id: 'kokoro',
    name: '藤枝心春',
    romaji: 'FUJIE KOHARU',
    title: '义妹 · 同住一个屋檐下',
    favor: 78,
    gender: '女',
    age: '17',
    birthday: '不详',
    hobby: '整理资料 · 味噌汤',
    desc: '哥哥的义妹。家务做得比谁都熟，唯独对你的作息时间记得最清楚。',
    tags: ['义妹', '味噌汤', '早睡早起', '记性好'],
    color: '#dd7a5f',
    initial: '心',
    codename: 'KOKORO',
    traits: [
      {
        label: '家务',
        title: '味噌汤',
        body: '每天早上都煮。咸淡按你的口味来，从来没问过你。',
      },
      {
        label: '习惯',
        title: '等你',
        body: '不管多晚，玄关的灯都是亮着的。',
      },
    ],
    bondLines: ['义妹 · 同住公寓', '她管着家里的冰箱和你的作息', '她很少问你去哪了，但都知道'],
  },
  {
    id: 'kaede',
    name: '早瀬枫',
    romaji: 'HAYASE KAEDE',
    title: '邻居 · 住隔壁',
    favor: 62,
    gender: '女',
    age: '20',
    birthday: '不详',
    hobby: '旧书 · 雨天散步',
    desc: '住在隔壁的邻居。搬来那天她送来一盒点心，之后就常在楼道里遇见。',
    tags: ['邻居', '旧书', '雨天', '温柔'],
    color: '#e0a95f',
    initial: '枫',
    codename: 'KAEDE',
    traits: [
      {
        label: '日常',
        title: '点心',
        body: '她的手艺很好，但每次都说是买多的。',
      },
      {
        label: '习惯',
        title: '雨天',
        body: '下雨天她会站在屋檐下等雨停，不撑伞。',
      },
    ],
    bondLines: ['邻居 · 隔壁那户', '她常在楼道里等雨停', '聊到某一年，她总会绕开'],
  },
  {
    id: 'akari',
    name: '白瀬灯',
    romaji: 'SHIRASE AKARI',
    title: '青梅 · 从小一起长大',
    favor: 92,
    gender: '女',
    age: '20',
    birthday: '不详',
    hobby: '黑咖啡 · 草莓蛋糕',
    desc: '从小一起长大的青梅竹马。最近总说很忙，见面次数少了很多，但你的消息她每条都回。',
    tags: ['青梅', '黑咖啡', '草莓蛋糕', '寡言'],
    color: '#4f8a90',
    initial: '灯',
    codename: 'AKARI',
    traits: [
      {
        label: '习惯',
        title: '黑咖啡',
        body: '不加糖。草莓蛋糕倒是每次都会吃完。',
      },
      {
        label: '距离',
        title: '最近',
        body: '推掉了好几次约，却会绕路经过你常去的那家店。',
      },
    ],
    bondLines: ['青梅 · 从小一起长大', '她知道你所有的旧事', '最近总说忙，人却总在附近'],
  },
  {
    id: 'sumiko',
    name: '七海澄子',
    romaji: 'NANAMI SUMIKO',
    title: '讲师 · 研究会指导',
    favor: 48,
    gender: '女',
    age: '29',
    birthday: '不详',
    hobby: '旧报纸 · 观察学生',
    desc: '大学讲师，都市传说研究会的指导老师。办公室的抽屉里塞满了旧报纸。',
    tags: ['讲师', '研究会', '旧报纸', '温和'],
    color: '#6f7fae',
    initial: '澄',
    codename: 'SUMIKO',
    traits: [
      {
        label: '研究',
        title: '剪报',
        body: '讲到兴头上，她会从抽屉里翻出一整叠。',
      },
      {
        label: '习惯',
        title: '停顿',
        body: '看你的时候会多停半秒，然后才笑一下。',
      },
    ],
    bondLines: ['讲师 · 研究会指导', '她对学生比对同事耐心', '她看人的时候总要多停半秒'],
  },
  {
    id: 'ren',
    name: '黒川涟',
    romaji: 'KUROKAWA REN',
    title: '夜班店员 · 便利店',
    favor: 70,
    gender: '女',
    age: '23',
    birthday: '不详',
    hobby: '夜班 · 薄荷糖',
    desc: '便利店夜班店员。手腕上偶尔有绷带，说是搬货蹭的；话不多，但认得熟客。',
    tags: ['夜班', '薄荷糖', '绷带', '话少'],
    color: '#95749f',
    initial: '涟',
    codename: 'REN',
    traits: [
      {
        label: '习惯',
        title: '薄荷糖',
        body: '柜台上那盒总是空的很快，她说是自己吃的。',
      },
      {
        label: '身体',
        title: '绷带',
        body: '换得很勤。问起来只说是搬货蹭的。',
      },
    ],
    bondLines: ['夜班店员 · 便利店', '凌晨的店里只有她一个人', '她不太喜欢别人靠太近'],
  },
];

export interface BondRank {
  rank: string;
  hearts: number;
}

export function bondRank(favor: number): BondRank {
  if (favor >= 90) return { rank: '宿命之绊 · BOND EX', hearts: 5 };
  if (favor >= 75) return { rank: '深厚信赖 · BOND IV', hearts: 4 };
  if (favor >= 55) return { rank: '交心之友 · BOND III', hearts: 3 };
  if (favor >= 35) return { rank: '熟识之契 · BOND II', hearts: 2 };
  return { rank: '初见之识 · BOND I', hearts: 1 };
}
