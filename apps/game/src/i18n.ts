import { useStore } from './state/store';

export type Lang = 'ru' | 'en';

/** UI string table. Russian is the priority language. Level/chapter names stay
 *  as brand English. Use {placeholders} for interpolated values. */
const STRINGS: Record<Lang, Record<string, string>> = {
  ru: {
    'lang.title': 'Выбери язык',
    'lang.subtitle': 'Choose your language',
    'lang.continue': 'Продолжить',

    'app.stars': 'Всего звёзд',
    'app.coins': 'Баланс монет',
    'app.leaderboard': 'Рейтинг',
    'app.sound': 'Звук',
    'app.language': 'Язык',

    'home.tagline': 'Дуэли на желания по видео. Проиграл — выполняешь!',
    'home.duel': 'Дуэль на желание',
    'home.duelSub': '🎥 Видео-рулетка со случайным соперником',
    'home.solo': 'Одиночная игра',
    'home.soloSub': '30 уровней в 5 сладких мирах',
    'home.leaderboard': 'Рейтинг',
    'home.leaderboardSub': 'Лучшие игроки мира',

    'duel.title': 'Дуэль на желание',
    'duel.tagline': 'Твой соперник появится здесь 👀',
    'duel.lead': '90 секунд — кто соберёт больше очков, побеждает. Проигравший выполняет желание на камеру! 😈',
    'duel.start': 'Начать',
    'duel.camNote': 'Нужен доступ к камере и микрофону 🎥🎙',
    'duel.camDenied': 'Нет доступа к камере. Разреши камеру и попробуй снова.',
    'duel.searching': 'Ищем соперника…',
    'duel.wishTitle': 'Загадай желание сопернику',
    'duel.wishBody': 'Если проиграет — выполнит это на камеру. Придумай что-нибудь весёлое! 😈',
    'duel.wishPlaceholder': 'Например: спой припев любимой песни',
    'duel.wishGo': 'Играть',
    'duel.waiting': 'Ждём соперника…',
    'duel.win': 'Ты выиграл! 🏆',
    'duel.lose': 'Ты проиграл 😅',
    'duel.draw': 'Ничья 🤝',
    'duel.youMust': 'Твоё задание',
    'duel.oppMust': 'Соперник выполнит',
    'duel.next': 'Дальше',
    'duel.exit': 'Выход',
    'duel.peerLeft': 'Соперник вышел. Попробуй снова.',

    'map.intro': 'Собирай конфеты, лови три звезды и покоряй пять сладких миров.',
    'map.best': 'Рекорд {n}',

    'hud.level': 'Уровень {n}',
    'hud.score': 'Очки',
    'hud.moves': 'Ходы',

    'booster.hint': 'Подсказка',
    'booster.shuffle': 'Перемешать',
    'booster.moves': '+5 ходов',
    'booster.free': 'Бесплатно',

    'result.win': 'Уровень пройден!',
    'result.lose': 'Ходы закончились',
    'result.points': '{n} очков',
    'result.earned': 'монет',
    'result.replay': 'Заново',
    'result.continue': 'Далее',
    'result.map': 'Карта',

    'lb.title': 'Рейтинг',
    'lb.global': 'Общий',
    'lb.you': 'ты',
    'lb.offline': 'Рейтинг доступен в онлайн-версии.',
    'lb.loading': 'Загрузка…',
    'lb.empty': 'Пока пусто — сыграй уровень и займи первое место! 🍬',
    'lb.footGlobal': 'Ранжирование по сумме лучших результатов.',
    'lb.footLevel': 'Уровень {n} — лучший результат сверху.',

    'obj.score': 'Набери {n} очков',
    'obj.collect': 'Собери {n} {sym} конфет',
    'obj.specials': 'Взорви {n} спецконфет',

    'ob1.title': 'Добро пожаловать в CandyBlast',
    'ob1.body': 'Свайпни конфету к соседней, чтобы поменять их местами. Собери 3+ конфеты одного цвета — они лопнут и дадут очки.',
    'ob2.title': 'Создавай спецконфеты',
    'ob2.body': '4 в ряд → полосатая (чистит линию), форма Г или Т → обёрнутая (взрыв 3×3), 5 в ряд → радужная бомба.',
    'ob3.title': 'Пройди уровень',
    'ob3.body': 'У каждого уровня есть цель и лимит ходов. Проходи, чтобы получать монеты и звёзды, открывать новые уровни и покупать бустеры.',
    'ob.next': 'Далее',
    'ob.play': 'Играть',
  },
  en: {
    'lang.title': 'Choose language',
    'lang.subtitle': 'Выбери язык',
    'lang.continue': 'Continue',

    'app.stars': 'Total stars',
    'app.coins': 'Your coins',
    'app.leaderboard': 'Leaderboard',
    'app.sound': 'Sound',
    'app.language': 'Language',

    'home.tagline': 'Video wish-duels. Lose and you do the dare!',
    'home.duel': 'Wish Duel',
    'home.duelSub': '🎥 Video roulette vs a random rival',
    'home.solo': 'Single player',
    'home.soloSub': '30 levels across 5 sweet worlds',
    'home.leaderboard': 'Leaderboard',
    'home.leaderboardSub': "The world's best players",

    'duel.title': 'Wish Duel',
    'duel.tagline': 'Your rival will appear here 👀',
    'duel.lead': '90 seconds — whoever scores more wins. The loser performs the wish on camera! 😈',
    'duel.start': 'Start',
    'duel.camNote': 'Camera & microphone access required 🎥🎙',
    'duel.camDenied': 'No camera access. Allow the camera and try again.',
    'duel.searching': 'Finding a rival…',
    'duel.wishTitle': 'Make a wish for your rival',
    'duel.wishBody': 'If they lose, they do it on camera. Make it fun! 😈',
    'duel.wishPlaceholder': 'e.g. sing the chorus of your favourite song',
    'duel.wishGo': 'Play',
    'duel.waiting': 'Waiting for your rival…',
    'duel.win': 'You won! 🏆',
    'duel.lose': 'You lost 😅',
    'duel.draw': 'Draw 🤝',
    'duel.youMust': 'Your dare',
    'duel.oppMust': 'Your rival must',
    'duel.next': 'Next',
    'duel.exit': 'Exit',
    'duel.peerLeft': 'Your rival left. Try again.',

    'map.intro': 'Match candies, chase three stars, and climb through five sweet worlds.',
    'map.best': 'Best {n}',

    'hud.level': 'Level {n}',
    'hud.score': 'Score',
    'hud.moves': 'Moves',

    'booster.hint': 'Hint',
    'booster.shuffle': 'Shuffle',
    'booster.moves': '+5 Moves',
    'booster.free': 'Free',

    'result.win': 'Level Cleared!',
    'result.lose': 'Out of Moves',
    'result.points': '{n} points',
    'result.earned': 'coins',
    'result.replay': 'Replay',
    'result.continue': 'Continue',
    'result.map': 'Map',

    'lb.title': 'Leaderboard',
    'lb.global': 'Global',
    'lb.you': 'you',
    'lb.offline': 'Leaderboards are available in the online version.',
    'lb.loading': 'Loading…',
    'lb.empty': 'No scores yet — play a level to claim the top spot! 🍬',
    'lb.footGlobal': 'Ranked by total best score across levels.',
    'lb.footLevel': 'Level {n} — highest score first.',

    'obj.score': 'Reach {n} points',
    'obj.collect': 'Collect {n} {sym} candies',
    'obj.specials': 'Detonate {n} special candies',

    'ob1.title': 'Welcome to CandyBlast',
    'ob1.body': 'Swipe a candy toward a neighbour to swap them. Line up 3 or more of the same colour to clear them and score.',
    'ob2.title': 'Make Special Candies',
    'ob2.body': 'Match 4 in a row for a Striped candy, an L or T shape for a Wrapped candy (3×3 blast), and 5 in a row for a Colour Bomb.',
    'ob3.title': 'Beat the Level',
    'ob3.body': 'Each level has an objective and a move limit. Clear it to earn coins and stars, unlock levels, and buy boosters.',
    'ob.next': 'Next',
    'ob.play': "Let's Play",
  },
};

export function translate(lang: Lang, key: string, params?: Record<string, string | number>): string {
  let s = STRINGS[lang][key] ?? STRINGS.en[key] ?? key;
  if (params) for (const [k, v] of Object.entries(params)) s = s.replace(`{${k}}`, String(v));
  return s;
}

export type TFn = (key: string, params?: Record<string, string | number>) => string;

/** Hook returning a translate function bound to the current language. */
export function useT(): TFn {
  const lang = useStore((s) => s.lang);
  return (key, params) => translate(lang, key, params);
}
