import { MemeTemplate, MemeItem } from '../types/meme';

export const PRIMARY_ADMIN_IDS = [502413224];

export const DEFAULT_TEMPLATES: MemeTemplate[] = [
  { 
    id: 't1', 
    title: 'Кот в беседе', 
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'><rect width='500' height='500' fill='%232a2d34'/><circle cx='250' cy='230' r='140' fill='%23e5e7eb'/><polygon points='130,150 170,70 210,130' fill='%23e5e7eb'/><polygon points='290,130 330,70 370,150' fill='%23e5e7eb'/><polygon points='145,140 170,85 195,125' fill='%23f472b6'/><polygon points='305,125 330,85 355,140' fill='%23f472b6'/><ellipse cx='200' cy='210' rx='18' ry='24' fill='%2310b981'/><ellipse cx='300' cy='210' rx='18' ry='24' fill='%2310b981'/><circle cx='200' cy='210' r='8' fill='%23000'/><circle cx='300' cy='210' r='8' fill='%23000'/><polygon points='240,240 260,240 250,255' fill='%23f472b6'/><path d='M220 265 Q235 280 250 265 Q265 280 280 265' stroke='%23000' stroke-width='4' fill='none'/></svg>"
  },
  { 
    id: 't2', 
    title: 'Удивленный пёс', 
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'><rect width='500' height='500' fill='%23374151'/><circle cx='250' cy='250' r='150' fill='%23d97706'/><circle cx='190' cy='210' r='30' fill='%23fff'/><circle cx='310' cy='210' r='30' fill='%23fff'/><circle cx='190' cy='210' r='12' fill='%23000'/><circle cx='310' cy='210' r='12' fill='%23000'/><ellipse cx='250' cy='280' rx='40' ry='30' fill='%2378350f'/></svg>"
  },
  {
    id: 't3',
    title: 'Две кнопки выбора',
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'><rect width='500' height='500' fill='%231e293b'/><circle cx='250' cy='180' r='110' fill='%23fcd34d'/><ellipse cx='215' cy='160' rx='14' ry='18' fill='%23000'/><ellipse cx='285' cy='160' rx='14' ry='18' fill='%23000'/><ellipse cx='250' cy='210' rx='35' ry='20' fill='%23ef4444'/><circle cx='290' cy='130' r='12' fill='%2338bdf8'/><path d='M290 118 Q305 130 290 142' stroke='%2338bdf8' stroke-width='3' fill='none'/><rect x='60' y='320' width='160' height='100' rx='16' fill='%23ef4444'/><rect x='280' y='320' width='160' height='100' rx='16' fill='%233b82f6'/><text x='140' y='380' font-family='Arial' font-weight='bold' font-size='22' fill='white' text-anchor='middle'>ВАРИАНТ А</text><text x='360' y='380' font-family='Arial' font-weight='bold' font-size='22' fill='white' text-anchor='middle'>ВАРИАНТ Б</text></svg>"
  },
  {
    id: 't4',
    title: 'Мегамозг',
    url: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'><rect width='500' height='500' fill='%230f172a'/><circle cx='250' cy='220' r='140' fill='%2338bdf8'/><ellipse cx='200' cy='210' rx='20' ry='26' fill='%23ffffff'/><ellipse cx='300' cy='210' rx='20' ry='26' fill='%23ffffff'/><circle cx='205' cy='210' r='10' fill='%230284c7'/><circle cx='305' cy='210' r='10' fill='%230284c7'/><path d='M170 170 Q200 150 230 170' stroke='%230369a1' stroke-width='6' fill='none'/><path d='M270 170 Q300 150 330 170' stroke='%230369a1' stroke-width='6' fill='none'/><path d='M200 270 Q250 320 300 270' stroke='%230369a1' stroke-width='8' fill='none'/></svg>"
  }
];

export const INITIAL_APPROVED_MEMES: MemeItem[] = [
  {
    id: 'seed-1',
    dataUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='500' height='500' viewBox='0 0 500 500'><rect width='500' height='500' fill='%232a2d34'/><circle cx='250' cy='230' r='140' fill='%23e5e7eb'/><polygon points='130,150 170,70 210,130' fill='%23e5e7eb'/><polygon points='290,130 330,70 370,150' fill='%23e5e7eb'/><ellipse cx='200' cy='210' rx='18' ry='24' fill='%2310b981'/><ellipse cx='300' cy='210' rx='18' ry='24' fill='%2310b981'/><circle cx='200' cy='210' r='8' fill='%23000'/><circle cx='300' cy='210' r='8' fill='%23000'/><path d='M220 265 Q235 280 250 265 Q265 280 280 265' stroke='%23000' stroke-width='4' fill='none'/><text x='250' y='60' font-family='Impact' font-size='38' font-weight='900' fill='white' stroke='black' stroke-width='3' text-anchor='middle'>КОГДА СДАЛ ПРОЕКТ</text><text x='250' y='460' font-family='Impact' font-size='38' font-weight='900' fill='white' stroke='black' stroke-width='3' text-anchor='middle'>ЗА 5 МИНУТ ДО ДЕДЛАЙНА</text></svg>",
    author: '@chat_legend',
    realAuthor: '@chat_legend',
    isAnonymous: false,
    timestamp: Date.now() - 3600000 * 2,
    status: 'approved'
  }
];
