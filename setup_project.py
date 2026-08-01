"""
Script de configuración inicial del proyecto.
Ejecutar una vez después de clonar el repositorio.

Uso:
    python setup_project.py
"""
import subprocess
import sys
import os
import shutil
from pathlib import Path


def main():
    print("=" * 60)
    print("CONFIGURACIÓN INICIAL DEL PROYECTO")
    print("Sistema de Análisis de Sentimientos Multiplataforma")
    print("=" * 60)
    print()

    project_root = Path(__file__).parent
    os.chdir(project_root)

    venv_path = project_root / "venv"
    if not venv_path.exists():
        print("[1/4] Creando entorno virtual...")
        subprocess.run([sys.executable, "-m", "venv", "venv"], check=True)
        print("     ✓ Entorno virtual creado")
    else:
        print("[1/4] Entorno virtual ya existe ✓")

    if sys.platform == "win32":
        pip_path = venv_path / "Scripts" / "pip.exe"
        python_path = venv_path / "Scripts" / "python.exe"
    else:
        pip_path = venv_path / "bin" / "pip"
        python_path = venv_path / "bin" / "python"

    print("[2/4] Actualizando pip...")
    subprocess.run(
        [str(python_path), "-m", "pip", "install", "--upgrade", "pip"],
        check=True,
        capture_output=True,
    )
    print("     ✓ pip actualizado")

    print("[3/4] Instalando dependencias (puede tardar varios minutos)...")
    subprocess.run([str(pip_path), "install", "-r", "requirements.txt"], check=True)
    print("     ✓ Dependencias instaladas")

    env_file = project_root / ".env"
    env_example = project_root / ".env.example"
    if not env_file.exists() and env_example.exists():
        print("[4/4] Creando archivo .env desde ejemplo...")
        shutil.copy(env_example, env_file)
        print("     ✓ Archivo .env creado — edítalo con tus credenciales")
    elif env_file.exists():
        print("[4/4] Archivo .env ya existe ✓")
    else:
        print("[4/4] No se encontró .env.example, saltando...")

    print()
    print("=" * 60)
    print("CONFIGURACIÓN COMPLETADA")
    print("=" * 60)
    print()
    print("Próximos pasos:")
    if sys.platform == "win32":
        print("  1. .\\venv\\Scripts\\Activate.ps1")
    else:
        print("  1. source venv/bin/activate")
    print("  2. Edita .env (DB_* y APIFY_TOKEN)")
    print("  3. python scripts/development/setup_database.py")
    print("  4. python scripts/development/init_database.py")
    print("  5. python scripts/run_api.py")
    print("  6. cd frontend && npm install && npm run dev")
    print()


if __name__ == "__main__":
    main()
