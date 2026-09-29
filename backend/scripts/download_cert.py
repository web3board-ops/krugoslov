"""
Скрипт для скачивания корневого сертификата НУЦ Минцифры
Используется для работы с GigaChat API в production
"""
import httpx
import os
from pathlib import Path


def download_certificate(output_path: str = "backend/certs/russian_trusted_root_ca.cer"):
    """
    Скачать корневой сертификат НУЦ Минцифры
    
    Args:
        output_path: Путь для сохранения сертификата
    """
    cert_url = "https://gu-st.ru/content/lending/russian_trusted_root_ca.cer"
    
    # Создаём директорию, если её нет
    output_dir = Path(output_path).parent
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Скачивание сертификата из {cert_url}...")
    
    try:
        with httpx.Client(follow_redirects=True, timeout=30.0) as client:
            response = client.get(cert_url)
            response.raise_for_status()
            
            with open(output_path, 'wb') as f:
                f.write(response.content)
            
            print(f"✓ Сертификат сохранён: {output_path}")
            print(f"  Размер: {len(response.content)} байт")
            
    except httpx.HTTPError as e:
        print(f"✗ Ошибка при скачивании: {e}")
        print("\nАльтернативные способы:")
        print("1. Скачать вручную: https://gu-st.ru/content/lending/russian_trusted_root_ca.cer")
        print("2. Использовать системное хранилище сертификатов")
        raise


if __name__ == "__main__":
    import sys
    
    output_path = sys.argv[1] if len(sys.argv) > 1 else "backend/certs/russian_trusted_root_ca.cer"
    download_certificate(output_path)
