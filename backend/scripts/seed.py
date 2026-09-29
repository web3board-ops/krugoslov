"""
Seed script to populate the database with initial data.
Run: python -m scripts.seed
"""
import asyncio
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from app.database import engine, async_session, Base
from app.models import Dictionary, Word, DictionaryWord
import unicodedata


def normalize_lemma(lemma: str) -> str:
    return unicodedata.normalize("NFC", lemma.strip()).casefold()


# Initial word data
INITIAL_WORDS = [
    # A1 level
    {"lemma": "run", "pos": "verb", "level": "A1", "translations": ["бегать", "бежать"]},
    {"lemma": "fast", "pos": "adv", "level": "A1", "translations": ["быстро"]},
    {"lemma": "fast", "pos": "adj", "level": "A1", "translations": ["быстрый"]},
    {"lemma": "house", "pos": "noun", "level": "A1", "translations": ["дом", "жилище"]},
    {"lemma": "big", "pos": "adj", "level": "A1", "translations": ["большой", "крупный"]},
    {"lemma": "small", "pos": "adj", "level": "A1", "translations": ["маленький", "небольшой"]},
    {"lemma": "cat", "pos": "noun", "level": "A1", "translations": ["кошка", "кот"]},
    {"lemma": "dog", "pos": "noun", "level": "A1", "translations": ["собака", "пёс"]},
    {"lemma": "eat", "pos": "verb", "level": "A1", "translations": ["есть", "кушать"]},
    {"lemma": "water", "pos": "noun", "level": "A1", "translations": ["вода"]},
    {"lemma": "book", "pos": "noun", "level": "A1", "translations": ["книга"]},
    {"lemma": "read", "pos": "verb", "level": "A1", "translations": ["читать", "прочитать"]},
    {"lemma": "happy", "pos": "adj", "level": "A1", "translations": ["счастливый", "радостный"]},
    {"lemma": "sad", "pos": "adj", "level": "A1", "translations": ["грустный", "печальный"]},
    {"lemma": "walk", "pos": "verb", "level": "A1", "translations": ["гулять", "ходить"]},
    {"lemma": "morning", "pos": "noun", "level": "A1", "translations": ["утро"]},
    {"lemma": "night", "pos": "noun", "level": "A1", "translations": ["ночь"]},
    {"lemma": "sleep", "pos": "verb", "level": "A1", "translations": ["спать"]},
    {"lemma": "friend", "pos": "noun", "level": "A1", "translations": ["друг", "подруга"]},
    {"lemma": "play", "pos": "verb", "level": "A1", "translations": ["играть"]},
    {"lemma": "school", "pos": "noun", "level": "A1", "translations": ["школа"]},
    {"lemma": "teacher", "pos": "noun", "level": "A1", "translations": ["учитель", "учительница"]},
    # A2 level
    {"lemma": "student", "pos": "noun", "level": "A2", "translations": ["студент", "ученик"]},
    {"lemma": "learn", "pos": "verb", "level": "A2", "translations": ["учить", "учиться"]},
    {"lemma": "important", "pos": "adj", "level": "A2", "translations": ["важный", "важная"]},
    {"lemma": "beautiful", "pos": "adj", "level": "A2", "translations": ["красивый", "прекрасный"]},
    {"lemma": "quickly", "pos": "adv", "level": "A2", "translations": ["быстро", "скоро"]},
    {"lemma": "slowly", "pos": "adv", "level": "A2", "translations": ["медленно"]},
    {"lemma": "travel", "pos": "verb", "level": "A2", "translations": ["путешествовать"]},
    {"lemma": "country", "pos": "noun", "level": "A2", "translations": ["страна"]},
    {"lemma": "city", "pos": "noun", "level": "A2", "translations": ["город"]},
    {"lemma": "weather", "pos": "noun", "level": "A2", "translations": ["погода"]},
    {"lemma": "rain", "pos": "noun", "level": "A2", "translations": ["дождь"]},
    {"lemma": "sun", "pos": "noun", "level": "A2", "translations": ["солнце"]},
    {"lemma": "cold", "pos": "adj", "level": "A2", "translations": ["холодный"]},
    {"lemma": "hot", "pos": "adj", "level": "A2", "translations": ["горячий", "жаркий"]},
    {"lemma": "cook", "pos": "verb", "level": "A2", "translations": ["готовить", "варить"]},
    {"lemma": "food", "pos": "noun", "level": "A2", "translations": ["еда", "пища"]},
    {"lemma": "music", "pos": "noun", "level": "A2", "translations": ["музыка"]},
    {"lemma": "dance", "pos": "verb", "level": "A2", "translations": ["танцевать"]},
    {"lemma": "sing", "pos": "verb", "level": "A2", "translations": ["петь"]},
    {"lemma": "movie", "pos": "noun", "level": "A2", "translations": ["фильм", "кино"]},
    {"lemma": "interesting", "pos": "adj", "level": "A2", "translations": ["интересный"]},
    {"lemma": "boring", "pos": "adj", "level": "A2", "translations": ["скучный"]},
    # B1 level
    {"lemma": "difficult", "pos": "adj", "level": "B1", "translations": ["трудный", "сложный"]},
    {"lemma": "easy", "pos": "adj", "level": "B1", "translations": ["лёгкий", "простой"]},
    {"lemma": "experience", "pos": "noun", "level": "B1", "translations": ["опыт"]},
    {"lemma": "opportunity", "pos": "noun", "level": "B1", "translations": ["возможность", "шанс"]},
    {"lemma": "decision", "pos": "noun", "level": "B1", "translations": ["решение"]},
    {"lemma": "achieve", "pos": "verb", "level": "B1", "translations": ["достигать", "достичь"]},
    {"lemma": "success", "pos": "noun", "level": "B1", "translations": ["успех"]},
    {"lemma": "failure", "pos": "noun", "level": "B1", "translations": ["неудача", "провал"]},
    {"lemma": "improve", "pos": "verb", "level": "B1", "translations": ["улучшать", "улучшить"]},
    {"lemma": "knowledge", "pos": "noun", "level": "B1", "translations": ["знание", "знания"]},
    {"lemma": "skill", "pos": "noun", "level": "B1", "translations": ["навык", "умение"]},
    {"lemma": "practice", "pos": "noun", "level": "B1", "translations": ["практика"]},
    {"lemma": "remember", "pos": "verb", "level": "B1", "translations": ["помнить", "запоминать"]},
    {"lemma": "forget", "pos": "verb", "level": "B1", "translations": ["забывать", "забыть"]},
    {"lemma": "understand", "pos": "verb", "level": "B1", "translations": ["понимать", "понять"]},
    {"lemma": "explain", "pos": "verb", "level": "B1", "translations": ["объяснять", "объяснить"]},
    # B2 level
    {"lemma": "environment", "pos": "noun", "level": "B2", "translations": ["окружающая среда", "окружение"]},
    {"lemma": "sustainable", "pos": "adj", "level": "B2", "translations": ["устойчивый"]},
    {"lemma": "significant", "pos": "adj", "level": "B2", "translations": ["значительный", "существенный"]},
    {"lemma": "consequence", "pos": "noun", "level": "B2", "translations": ["последствие", "результат"]},
    {"lemma": "nevertheless", "pos": "adv", "level": "B2", "translations": ["тем не менее", "всё же"]},
]


async def seed():
    """Seed the database with initial data"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with async_session() as session:
        # Check if general dictionary already exists
        result = await session.execute(
            select(Dictionary).where(Dictionary.is_general == True)
        )
        if result.scalar_one_or_none():
            print("General dictionary already exists. Skipping seed.")
            return
        
        # Create general dictionary
        dictionary = Dictionary(
            code="general",
            name="Общий словарь",
            description="Базовые слова английского языка для повседневного общения",
            is_general=True
        )
        session.add(dictionary)
        await session.flush()
        
        # Create words
        words_added = 0
        for word_data in INITIAL_WORDS:
            lemma = word_data["lemma"]
            lemma_key = normalize_lemma(lemma)
            pos = word_data["pos"]
            
            # Check if word already exists
            result = await session.execute(
                select(Word).where(
                    Word.lemma_key == lemma_key,
                    Word.pos == pos
                )
            )
            word = result.scalar_one_or_none()
            
            if not word:
                word = Word(
                    lemma=lemma,
                    lemma_key=lemma_key,
                    pos=pos,
                    level=word_data["level"],
                    translations=word_data["translations"]
                )
                session.add(word)
                await session.flush()
                words_added += 1
            
            # Link to dictionary
            result = await session.execute(
                select(DictionaryWord).where(
                    DictionaryWord.dictionary_id == dictionary.id,
                    DictionaryWord.word_id == word.id
                )
            )
            if not result.scalar_one_or_none():
                dw = DictionaryWord(
                    dictionary_id=dictionary.id,
                    word_id=word.id
                )
                session.add(dw)
        
        await session.commit()
        print(f"Seed completed. Added {words_added} words to general dictionary.")


if __name__ == "__main__":
    asyncio.run(seed())
