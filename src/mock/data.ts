import { Word, Dictionary } from '../types';

// Mock dictionary of English words with Russian translations
export const MOCK_WORDS: Word[] = [
  { id: 1, lemma: 'run', lemma_key: 'run', pos: 'verb', level: 'A1', translations: ['бегать', 'бежать'] },
  { id: 2, lemma: 'fast', lemma_key: 'fast', pos: 'adv', level: 'A1', translations: ['быстро'] },
  { id: 3, lemma: 'fast', lemma_key: 'fast', pos: 'adj', level: 'A1', translations: ['быстрый'] },
  { id: 4, lemma: 'house', lemma_key: 'house', pos: 'noun', level: 'A1', translations: ['дом', 'жилище'] },
  { id: 5, lemma: 'big', lemma_key: 'big', pos: 'adj', level: 'A1', translations: ['большой', 'крупный'] },
  { id: 6, lemma: 'small', lemma_key: 'small', pos: 'adj', level: 'A1', translations: ['маленький', 'небольшой'] },
  { id: 7, lemma: 'cat', lemma_key: 'cat', pos: 'noun', level: 'A1', translations: ['кошка', 'кот'] },
  { id: 8, lemma: 'dog', lemma_key: 'dog', pos: 'noun', level: 'A1', translations: ['собака', 'пёс'] },
  { id: 9, lemma: 'eat', lemma_key: 'eat', pos: 'verb', level: 'A1', translations: ['есть', 'кушать'] },
  { id: 10, lemma: 'water', lemma_key: 'water', pos: 'noun', level: 'A1', translations: ['вода'] },
  { id: 11, lemma: 'book', lemma_key: 'book', pos: 'noun', level: 'A1', translations: ['книга'] },
  { id: 12, lemma: 'read', lemma_key: 'read', pos: 'verb', level: 'A1', translations: ['читать', 'прочитать'] },
  { id: 13, lemma: 'happy', lemma_key: 'happy', pos: 'adj', level: 'A1', translations: ['счастливый', 'радостный'] },
  { id: 14, lemma: 'sad', lemma_key: 'sad', pos: 'adj', level: 'A1', translations: ['грустный', 'печальный'] },
  { id: 15, lemma: 'walk', lemma_key: 'walk', pos: 'verb', level: 'A1', translations: ['гулять', 'ходить'] },
  { id: 16, lemma: 'morning', lemma_key: 'morning', pos: 'noun', level: 'A1', translations: ['утро'] },
  { id: 17, lemma: 'night', lemma_key: 'night', pos: 'noun', level: 'A1', translations: ['ночь'] },
  { id: 18, lemma: 'sleep', lemma_key: 'sleep', pos: 'verb', level: 'A1', translations: ['спать'] },
  { id: 19, lemma: 'friend', lemma_key: 'friend', pos: 'noun', level: 'A1', translations: ['друг', 'подруга'] },
  { id: 20, lemma: 'play', lemma_key: 'play', pos: 'verb', level: 'A1', translations: ['играть'] },
  { id: 21, lemma: 'school', lemma_key: 'school', pos: 'noun', level: 'A1', translations: ['школа'] },
  { id: 22, lemma: 'teacher', lemma_key: 'teacher', pos: 'noun', level: 'A1', translations: ['учитель', 'учительница'] },
  { id: 23, lemma: 'student', lemma_key: 'student', pos: 'noun', level: 'A2', translations: ['студент', 'ученик'] },
  { id: 24, lemma: 'learn', lemma_key: 'learn', pos: 'verb', level: 'A2', translations: ['учить', 'учиться'] },
  { id: 25, lemma: 'important', lemma_key: 'important', pos: 'adj', level: 'A2', translations: ['важный', 'важная'] },
  { id: 26, lemma: 'beautiful', lemma_key: 'beautiful', pos: 'adj', level: 'A2', translations: ['красивый', 'прекрасный'] },
  { id: 27, lemma: 'quickly', lemma_key: 'quickly', pos: 'adv', level: 'A2', translations: ['быстро', 'скоро'] },
  { id: 28, lemma: 'slowly', lemma_key: 'slowly', pos: 'adv', level: 'A2', translations: ['медленно'] },
  { id: 29, lemma: 'travel', lemma_key: 'travel', pos: 'verb', level: 'A2', translations: ['путешествовать'] },
  { id: 30, lemma: 'country', lemma_key: 'country', pos: 'noun', level: 'A2', translations: ['страна'] },
  { id: 31, lemma: 'city', lemma_key: 'city', pos: 'noun', level: 'A2', translations: ['город'] },
  { id: 32, lemma: 'weather', lemma_key: 'weather', pos: 'noun', level: 'A2', translations: ['погода'] },
  { id: 33, lemma: 'rain', lemma_key: 'rain', pos: 'noun', level: 'A2', translations: ['дождь'] },
  { id: 34, lemma: 'sun', lemma_key: 'sun', pos: 'noun', level: 'A2', translations: ['солнце'] },
  { id: 35, lemma: 'cold', lemma_key: 'cold', pos: 'adj', level: 'A2', translations: ['холодный'] },
  { id: 36, lemma: 'hot', lemma_key: 'hot', pos: 'adj', level: 'A2', translations: ['горячий', 'жаркий'] },
  { id: 37, lemma: 'cook', lemma_key: 'cook', pos: 'verb', level: 'A2', translations: ['готовить', 'варить'] },
  { id: 38, lemma: 'food', lemma_key: 'food', pos: 'noun', level: 'A2', translations: ['еда', 'пища'] },
  { id: 39, lemma: 'music', lemma_key: 'music', pos: 'noun', level: 'A2', translations: ['музыка'] },
  { id: 40, lemma: 'dance', lemma_key: 'dance', pos: 'verb', level: 'A2', translations: ['танцевать'] },
  { id: 41, lemma: 'sing', lemma_key: 'sing', pos: 'verb', level: 'A2', translations: ['петь'] },
  { id: 42, lemma: 'movie', lemma_key: 'movie', pos: 'noun', level: 'A2', translations: ['фильм', 'кино'] },
  { id: 43, lemma: 'interesting', lemma_key: 'interesting', pos: 'adj', level: 'A2', translations: ['интересный'] },
  { id: 44, lemma: 'boring', lemma_key: 'boring', pos: 'adj', level: 'A2', translations: ['скучный'] },
  { id: 45, lemma: 'difficult', lemma_key: 'difficult', pos: 'adj', level: 'B1', translations: ['трудный', 'сложный'] },
  { id: 46, lemma: 'easy', lemma_key: 'easy', pos: 'adj', level: 'B1', translations: ['лёгкий', 'простой'] },
  { id: 47, lemma: 'experience', lemma_key: 'experience', pos: 'noun', level: 'B1', translations: ['опыт'] },
  { id: 48, lemma: 'opportunity', lemma_key: 'opportunity', pos: 'noun', level: 'B1', translations: ['возможность', 'шанс'] },
  { id: 49, lemma: 'decision', lemma_key: 'decision', pos: 'noun', level: 'B1', translations: ['решение'] },
  { id: 50, lemma: 'achieve', lemma_key: 'achieve', pos: 'verb', level: 'B1', translations: ['достигать', 'достичь'] },
  { id: 51, lemma: 'success', lemma_key: 'success', pos: 'noun', level: 'B1', translations: ['успех'] },
  { id: 52, lemma: 'failure', lemma_key: 'failure', pos: 'noun', level: 'B1', translations: ['неудача', 'провал'] },
  { id: 53, lemma: 'improve', lemma_key: 'improve', pos: 'verb', level: 'B1', translations: ['улучшать', 'улучшить'] },
  { id: 54, lemma: 'knowledge', lemma_key: 'knowledge', pos: 'noun', level: 'B1', translations: ['знание', 'знания'] },
  { id: 55, lemma: 'skill', lemma_key: 'skill', pos: 'noun', level: 'B1', translations: ['навык', 'умение'] },
  { id: 56, lemma: 'practice', lemma_key: 'practice', pos: 'noun', level: 'B1', translations: ['практика'] },
  { id: 57, lemma: 'remember', lemma_key: 'remember', pos: 'verb', level: 'B1', translations: ['помнить', 'запоминать'] },
  { id: 58, lemma: 'forget', lemma_key: 'forget', pos: 'verb', level: 'B1', translations: ['забывать', 'забыть'] },
  { id: 59, lemma: 'understand', lemma_key: 'understand', pos: 'verb', level: 'B1', translations: ['понимать', 'понять'] },
  { id: 60, lemma: 'explain', lemma_key: 'explain', pos: 'verb', level: 'B1', translations: ['объяснять', 'объяснить'] },
  { id: 61, lemma: 'environment', lemma_key: 'environment', pos: 'noun', level: 'B2', translations: ['окружающая среда', 'окружение'] },
  { id: 62, lemma: 'sustainable', lemma_key: 'sustainable', pos: 'adj', level: 'B2', translations: ['устойчивый'] },
  { id: 63, lemma: 'significant', lemma_key: 'significant', pos: 'adj', level: 'B2', translations: ['значительный', 'существенный'] },
  { id: 64, lemma: 'consequence', lemma_key: 'consequence', pos: 'noun', level: 'B2', translations: ['последствие', 'результат'] },
  { id: 65, lemma: 'nevertheless', lemma_key: 'nevertheless', pos: 'adv', level: 'B2', translations: ['тем не менее', 'всё же'] },
];

// Pre-generated sentences for exercises (simulates LLM output)
export const SENTENCE_TEMPLATES: Record<string, { sentence: string; translation: string; forms: Record<number, string> }[]> = {
  '1,2': [
    { sentence: 'She runs fast every morning.', translation: 'Она быстро бегает каждое утро.', forms: { 1: 'runs', 2: 'fast' } },
    { sentence: 'The children run fast in the park.', translation: 'Дети быстро бегают в парке.', forms: { 1: 'run', 2: 'fast' } },
  ],
  '4,5': [
    { sentence: 'They live in a big house.', translation: 'Они живут в большом доме.', forms: { 4: 'house', 5: 'big' } },
    { sentence: 'The big house is on the hill.', translation: 'Большой дом находится на холме.', forms: { 4: 'house', 5: 'big' } },
  ],
  '6,7': [
    { sentence: 'The small cat sits on the sofa.', translation: 'Маленькая кошка сидит на диване.', forms: { 6: 'small', 7: 'cat' } },
  ],
  '8,9': [
    { sentence: 'The dog eats food quickly.', translation: 'Собака быстро ест еду.', forms: { 8: 'dog', 9: 'eats' } },
  ],
  '10,11': [
    { sentence: 'I drink water and read a book.', translation: 'Я пью воду и читаю книгу.', forms: { 10: 'water', 11: 'book' } },
  ],
  '12,13': [
    { sentence: 'She reads a book and feels happy.', translation: 'Она читает книгу и чувствует себя счастливой.', forms: { 12: 'reads', 13: 'happy' } },
  ],
  '14,15': [
    { sentence: 'He walks in the rain and feels sad.', translation: 'Он гуляет под дождём и чувствует грусть.', forms: { 14: 'sad', 15: 'walks' } },
  ],
  '16,18': [
    { sentence: 'I sleep late every morning.', translation: 'Я долго сплю каждое утро.', forms: { 16: 'morning', 18: 'sleep' } },
  ],
  '17,18': [
    { sentence: 'We sleep well at night.', translation: 'Мы хорошо спим ночью.', forms: { 17: 'night', 18: 'sleep' } },
  ],
  '19,20': [
    { sentence: 'My friend likes to play football.', translation: 'Мой друг любит играть в футбол.', forms: { 19: 'friend', 20: 'play' } },
  ],
  '21,22': [
    { sentence: 'The teacher works at the school.', translation: 'Учитель работает в школе.', forms: { 21: 'school', 22: 'teacher' } },
  ],
  '23,24': [
    { sentence: 'The student learns new words every day.', translation: 'Студент учит новые слова каждый день.', forms: { 23: 'student', 24: 'learns' } },
  ],
  '25,26': [
    { sentence: 'It is important to have a beautiful garden.', translation: 'Важно иметь красивый сад.', forms: { 25: 'important', 26: 'beautiful' } },
  ],
  '27,28': [
    { sentence: 'He runs quickly but walks slowly.', translation: 'Он бежит быстро, но идёт медленно.', forms: { 27: 'quickly', 28: 'slowly' } },
  ],
  '29,30': [
    { sentence: 'We travel to a new country every year.', translation: 'Мы путешествуем в новую страну каждый год.', forms: { 29: 'travel', 30: 'country' } },
  ],
  '31,32': [
    { sentence: 'The weather in this city is wonderful.', translation: 'Погода в этом городе замечательная.', forms: { 31: 'city', 32: 'weather' } },
  ],
  '33,34': [
    { sentence: 'The sun comes out after the rain.', translation: 'Солнце выходит после дождя.', forms: { 33: 'rain', 34: 'sun' } },
  ],
  '35,36': [
    { sentence: 'The weather is cold but the food is hot.', translation: 'Погода холодная, но еда горячая.', forms: { 35: 'cold', 36: 'hot' } },
  ],
  '37,38': [
    { sentence: 'She cooks food for the whole family.', translation: 'Она готовит еду для всей семьи.', forms: { 37: 'cooks', 38: 'food' } },
  ],
  '39,40': [
    { sentence: 'They dance to the music all night.', translation: 'Они танцуют под музыку всю ночь.', forms: { 39: 'music', 40: 'dance' } },
  ],
  '41,42': [
    { sentence: 'She sings in every movie she watches.', translation: 'Она поёт в каждом фильме, который смотрит.', forms: { 41: 'sings', 42: 'movie' } },
  ],
  '43,44': [
    { sentence: 'The interesting movie was not boring at all.', translation: 'Интересный фильм совсем не был скучным.', forms: { 43: 'interesting', 44: 'boring' } },
  ],
  '45,46': [
    { sentence: 'The difficult task was easy for her.', translation: 'Сложная задача была для неё лёгкой.', forms: { 45: 'difficult', 46: 'easy' } },
  ],
  '47,48': [
    { sentence: 'This experience gives you a great opportunity.', translation: 'Этот опыт даёт тебе отличную возможность.', forms: { 47: 'experience', 48: 'opportunity' } },
  ],
  '49,50': [
    { sentence: 'She made a decision to achieve her goals.', translation: 'Она приняла решение достичь своих целей.', forms: { 49: 'decision', 50: 'achieve' } },
  ],
  '51,52': [
    { sentence: 'Success comes after many failures.', translation: 'Успех приходит после многих неудач.', forms: { 51: 'Success', 52: 'failures' } },
  ],
  '53,54': [
    { sentence: 'You can improve your knowledge every day.', translation: 'Ты можешь улучшать свои знания каждый день.', forms: { 53: 'improve', 54: 'knowledge' } },
  ],
  '55,56': [
    { sentence: 'Practice helps you develop a new skill.', translation: 'Практика помогает развить новый навык.', forms: { 55: 'skill', 56: 'Practice' } },
  ],
  '57,58': [
    { sentence: 'I remember everything but forget names.', translation: 'Я всё помню, но забываю имена.', forms: { 57: 'remember', 58: 'forget' } },
  ],
  '59,60': [
    { sentence: 'Can you explain what you understand?', translation: 'Можешь объяснить, что ты понимаешь?', forms: { 59: 'understand', 60: 'explain' } },
  ],
  '61,62': [
    { sentence: 'We need a sustainable environment for future.', translation: 'Нам нужна устойчивая окружающая среда для будущего.', forms: { 61: 'environment', 62: 'sustainable' } },
  ],
  '63,64': [
    { sentence: 'This decision has significant consequences.', translation: 'Это решение имеет значительные последствия.', forms: { 63: 'significant', 64: 'consequences' } },
  ],
  '64,65': [
    { sentence: 'The consequences were bad, nevertheless we continued.', translation: 'Последствия были плохими, тем не менее мы продолжили.', forms: { 64: 'consequences', 65: 'nevertheless' } },
  ],
  // Single word templates
  '1': [
    { sentence: 'I run every day.', translation: 'Я бегаю каждый день.', forms: { 1: 'run' } },
    { sentence: 'She runs in the park.', translation: 'Она бегает в парке.', forms: { 1: 'runs' } },
  ],
  '2': [
    { sentence: 'He drives fast.', translation: 'Он водит быстро.', forms: { 2: 'fast' } },
  ],
  '3': [
    { sentence: 'She is a fast runner.', translation: 'Она быстрая бегунья.', forms: { 3: 'fast' } },
  ],
  '4': [
    { sentence: 'This house is very old.', translation: 'Этот дом очень старый.', forms: { 4: 'house' } },
  ],
  '5': [
    { sentence: 'I have a big family.', translation: 'У меня большая семья.', forms: { 5: 'big' } },
  ],
  '6': [
    { sentence: 'The small bird flies away.', translation: 'Маленькая птица улетает.', forms: { 6: 'small' } },
  ],
  '7': [
    { sentence: 'The cat sleeps on the bed.', translation: 'Кошка спит на кровати.', forms: { 7: 'cat' } },
  ],
  '8': [
    { sentence: 'The dog plays in the garden.', translation: 'Собака играет в саду.', forms: { 8: 'dog' } },
  ],
  '9': [
    { sentence: 'We eat dinner at seven.', translation: 'Мы ужинаем в семь.', forms: { 9: 'eat' } },
  ],
  '10': [
    { sentence: 'I need some water please.', translation: 'Мне нужна вода, пожалуйста.', forms: { 10: 'water' } },
  ],
  '11': [
    { sentence: 'This book is very interesting.', translation: 'Эта книга очень интересная.', forms: { 11: 'book' } },
  ],
  '12': [
    { sentence: 'I read books every evening.', translation: 'Я читаю книги каждый вечер.', forms: { 12: 'read' } },
  ],
  '13': [
    { sentence: 'She looks very happy today.', translation: 'Она выглядит очень счастливой сегодня.', forms: { 13: 'happy' } },
  ],
  '14': [
    { sentence: 'He feels sad about the news.', translation: 'Он грустит из-за новостей.', forms: { 14: 'sad' } },
  ],
  '15': [
    { sentence: 'We walk to school together.', translation: 'Мы ходим в школу вместе.', forms: { 15: 'walk' } },
  ],
  '16': [
    { sentence: 'Good morning everyone!', translation: 'Доброе утро всем!', forms: { 16: 'morning' } },
  ],
  '17': [
    { sentence: 'The stars shine at night.', translation: 'Звёзды светят ночью.', forms: { 17: 'night' } },
  ],
  '18': [
    { sentence: 'I sleep eight hours every day.', translation: 'Я сплю восемь часов каждый день.', forms: { 18: 'sleep' } },
  ],
  '19': [
    { sentence: 'My best friend lives nearby.', translation: 'Мой лучший друг живёт поблизости.', forms: { 19: 'friend' } },
  ],
  '20': [
    { sentence: 'Children play outside after school.', translation: 'Дети играют на улице после школы.', forms: { 20: 'play' } },
  ],
  '21': [
    { sentence: 'I go to school by bus.', translation: 'Я хожу в школу на автобусе.', forms: { 21: 'school' } },
  ],
  '22': [
    { sentence: 'Our teacher is very kind.', translation: 'Наш учитель очень добрый.', forms: { 22: 'teacher' } },
  ],
  '23': [
    { sentence: 'The student answered the question.', translation: 'Студент ответил на вопрос.', forms: { 23: 'student' } },
  ],
  '24': [
    { sentence: 'I want to learn English well.', translation: 'Я хочу хорошо выучить английский.', forms: { 24: 'learn' } },
  ],
  '25': [
    { sentence: 'This is an important meeting.', translation: 'Это важная встреча.', forms: { 25: 'important' } },
  ],
  '26': [
    { sentence: 'The sunset was beautiful.', translation: 'Закат был красивым.', forms: { 26: 'beautiful' } },
  ],
  '27': [
    { sentence: 'She finished the work quickly.', translation: 'Она быстро закончила работу.', forms: { 27: 'quickly' } },
  ],
  '28': [
    { sentence: 'The old man walks slowly.', translation: 'Старик идёт медленно.', forms: { 28: 'slowly' } },
  ],
  '29': [
    { sentence: 'We love to travel together.', translation: 'Мы любим путешествовать вместе.', forms: { 29: 'travel' } },
  ],
  '30': [
    { sentence: 'France is a beautiful country.', translation: 'Франция — красивая страна.', forms: { 30: 'country' } },
  ],
  '31': [
    { sentence: 'London is a very big city.', translation: 'Лондон — очень большой город.', forms: { 31: 'city' } },
  ],
  '32': [
    { sentence: 'The weather is nice today.', translation: 'Сегодня хорошая погода.', forms: { 32: 'weather' } },
  ],
  '33': [
    { sentence: 'The rain stopped an hour ago.', translation: 'Дождь прекратился час назад.', forms: { 33: 'rain' } },
  ],
  '34': [
    { sentence: 'The sun is shining brightly.', translation: 'Солнце ярко светит.', forms: { 34: 'sun' } },
  ],
  '35': [
    { sentence: 'It is very cold outside.', translation: 'На улице очень холодно.', forms: { 35: 'cold' } },
  ],
  '36': [
    { sentence: 'The tea is too hot.', translation: 'Чай слишком горячий.', forms: { 36: 'hot' } },
  ],
  '37': [
    { sentence: 'My mother cooks very well.', translation: 'Моя мама очень хорошо готовит.', forms: { 37: 'cooks' } },
  ],
  '38': [
    { sentence: 'The food smells delicious.', translation: 'Еда вкусно пахнет.', forms: { 38: 'food' } },
  ],
  '39': [
    { sentence: 'I listen to music every day.', translation: 'Я слушаю музыку каждый день.', forms: { 39: 'music' } },
  ],
  '40': [
    { sentence: 'They dance at every party.', translation: 'Они танцуют на каждой вечеринке.', forms: { 40: 'dance' } },
  ],
  '41': [
    { sentence: 'She sings beautifully.', translation: 'Она красиво поёт.', forms: { 41: 'sings' } },
  ],
  '42': [
    { sentence: 'We watched a great movie.', translation: 'Мы посмотрели отличный фильм.', forms: { 42: 'movie' } },
  ],
  '43': [
    { sentence: 'That was an interesting story.', translation: 'Это была интересная история.', forms: { 43: 'interesting' } },
  ],
  '44': [
    { sentence: 'The lecture was really boring.', translation: 'Лекция была действительно скучной.', forms: { 44: 'boring' } },
  ],
  '45': [
    { sentence: 'This exam was very difficult.', translation: 'Этот экзамен был очень трудным.', forms: { 45: 'difficult' } },
  ],
  '46': [
    { sentence: 'The question was quite easy.', translation: 'Вопрос был довольно лёгким.', forms: { 46: 'easy' } },
  ],
  '47': [
    { sentence: 'It was a valuable experience.', translation: 'Это был ценный опыт.', forms: { 47: 'experience' } },
  ],
  '48': [
    { sentence: 'Don\'t miss this opportunity.', translation: 'Не упусти эту возможность.', forms: { 48: 'opportunity' } },
  ],
  '49': [
    { sentence: 'Make the right decision.', translation: 'Прими правильное решение.', forms: { 49: 'decision' } },
  ],
  '50': [
    { sentence: 'She wants to achieve her dreams.', translation: 'Она хочет достичь своих мечт.', forms: { 50: 'achieve' } },
  ],
  '51': [
    { sentence: 'Hard work leads to success.', translation: 'Тяжёлая работа ведёт к успеху.', forms: { 51: 'success' } },
  ],
  '52': [
    { sentence: 'Failure teaches us lessons.', translation: 'Неудача учит нас урокам.', forms: { 52: 'Failure' } },
  ],
  '53': [
    { sentence: 'You should improve your skills.', translation: 'Тебе следует улучшить свои навыки.', forms: { 53: 'improve' } },
  ],
  '54': [
    { sentence: 'Knowledge is power.', translation: 'Знание — это сила.', forms: { 54: 'Knowledge' } },
  ],
  '55': [
    { sentence: 'Cooking is a useful skill.', translation: 'Готовка — полезный навык.', forms: { 55: 'skill' } },
  ],
  '56': [
    { sentence: 'Daily practice makes perfect.', translation: 'Ежедневная практика приводит к совершенству.', forms: { 56: 'practice' } },
  ],
  '57': [
    { sentence: 'I remember your face clearly.', translation: 'Я чётко помню твоё лицо.', forms: { 57: 'remember' } },
  ],
  '58': [
    { sentence: 'Don\'t forget to call me.', translation: 'Не забудь мне позвонить.', forms: { 58: 'forget' } },
  ],
  '59': [
    { sentence: 'I understand your problem.', translation: 'Я понимаю твою проблему.', forms: { 59: 'understand' } },
  ],
  '60': [
    { sentence: 'Please explain this rule.', translation: 'Пожалуйста, объясни это правило.', forms: { 60: 'explain' } },
  ],
  '61': [
    { sentence: 'We must protect the environment.', translation: 'Мы должны защищать окружающую среду.', forms: { 61: 'environment' } },
  ],
  '62': [
    { sentence: 'Sustainable development is crucial.', translation: 'Устойчивое развитие крайне важно.', forms: { 62: 'Sustainable' } },
  ],
  '63': [
    { sentence: 'This is a significant achievement.', translation: 'Это значительное достижение.', forms: { 63: 'significant' } },
  ],
  '64': [
    { sentence: 'Every action has a consequence.', translation: 'Каждое действие имеет последствие.', forms: { 64: 'consequence' } },
  ],
  '65': [
    { sentence: 'Nevertheless, we must continue.', translation: 'Тем не менее, мы должны продолжать.', forms: { 65: 'Nevertheless' } },
  ],
};

export const MOCK_DICTIONARIES: Dictionary[] = [
  {
    id: 1,
    code: 'general',
    name: 'Общий словарь',
    description: 'Базовые слова английского языка для повседневного общения',
    is_general: true,
    word_ids: MOCK_WORDS.map(w => w.id),
  },
  {
    id: 2,
    code: 'travel',
    name: 'Путешествия',
    description: 'Слова для общения во время путешествий',
    is_general: false,
    word_ids: [29, 30, 31, 32, 33, 34, 35, 36, 10, 15],
  },
  {
    id: 3,
    code: 'food',
    name: 'Еда и кухня',
    description: 'Слова о еде, готовке и ресторане',
    is_general: false,
    word_ids: [9, 10, 37, 38, 35, 36, 5, 6],
  },
];

// Suggested new words for exercises (simulates LLM suggestions)
export const SUGGESTION_POOL: { word_id: number; lemma: string; pos: string; translations: string[] }[] = [
  { word_id: 3, lemma: 'fast', pos: 'adj', translations: ['быстрый'] },
  { word_id: 5, lemma: 'big', pos: 'adj', translations: ['большой'] },
  { word_id: 6, lemma: 'small', pos: 'adj', translations: ['маленький'] },
  { word_id: 10, lemma: 'water', pos: 'noun', translations: ['вода'] },
  { word_id: 15, lemma: 'walk', pos: 'verb', translations: ['гулять'] },
  { word_id: 16, lemma: 'morning', pos: 'noun', translations: ['утро'] },
  { word_id: 17, lemma: 'night', pos: 'noun', translations: ['ночь'] },
  { word_id: 19, lemma: 'friend', pos: 'noun', translations: ['друг'] },
  { word_id: 20, lemma: 'play', pos: 'verb', translations: ['играть'] },
  { word_id: 26, lemma: 'beautiful', pos: 'adj', translations: ['красивый'] },
  { word_id: 39, lemma: 'music', pos: 'noun', translations: ['музыка'] },
  { word_id: 42, lemma: 'movie', pos: 'noun', translations: ['фильм'] },
];
