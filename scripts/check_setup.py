"""
Script de diagnóstico para verificar que el proyecto está configurado correctamente.
Ejecutar desde la raíz del proyecto: python scripts/check_setup.py
"""
import sys
import os
from pathlib import Path

def check_setup():
    print("=" * 60)
    print("🔍 DIAGNÓSTICO DE CONFIGURACIÓN DEL PROYECTO")
    print("=" * 60)
    
    errors = []
    warnings = []
    
    # 1. Verificar directorio actual
    cwd = Path.cwd()
    print(f"\n📁 Directorio actual: {cwd}")
    
    # 2. Verificar que estamos en la raíz del proyecto
    if not (cwd / "pyproject.toml").exists():
        errors.append("❌ No se encontró pyproject.toml. ¿Estás en la raíz del proyecto?")
        print("   ❌ pyproject.toml NO encontrado")
    else:
        print("   ✅ pyproject.toml encontrado")
    
    if not (cwd / "src").is_dir():
        errors.append("❌ No se encontró carpeta 'src'. ¿Estás en la raíz del proyecto?")
        print("   ❌ Carpeta 'src' NO encontrada")
    else:
        print("   ✅ Carpeta 'src' encontrada")
    
    # Verificar config de base de datos
    db_config = cwd / "config" / "database" / "database.json"
    if db_config.exists():
        print("   ✅ config/database/database.json encontrado")
    else:
        errors.append("❌ Falta config/database/database.json")
        print("   ❌ config/database/database.json NO encontrado")
    
    # 3. Verificar estructura de src
    print("\n📦 Verificando estructura de paquetes...")
    
    required_inits = [
        "src/__init__.py",
        "src/scraper/__init__.py",
        "src/scraper/models/__init__.py",
        "src/scraper/config/__init__.py",
        "src/scraper/repository/__init__.py",
        "src/database/__init__.py",
        "src/utils/__init__.py",
        "src/analyzers/__init__.py",
        "src/cleaners/__init__.py",
        "src/collectors/__init__.py",
    ]
    
    for init_path in required_inits:
        full_path = cwd / init_path
        if full_path.exists():
            print(f"   ✅ {init_path}")
        else:
            errors.append(f"❌ Falta: {init_path}")
            print(f"   ❌ {init_path} - FALTA!")
    
    # 4. Verificar archivo .env
    print("\n🔐 Verificando configuración de entorno...")
    env_file = cwd / ".env"
    env_example = cwd / ".env.example"
    
    if env_file.exists():
        print("   ✅ Archivo .env encontrado")
        
        # Verificar variables críticas
        try:
            with open(env_file, 'r') as f:
                env_content = f.read()
            
            required_vars = ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD']
            for var in required_vars:
                if f'{var}=' in env_content:
                    # Verificar que no esté vacío o con valor placeholder
                    import re
                    match = re.search(f'{var}=(.+)', env_content)
                    if match and match.group(1).strip() and 'tu_' not in match.group(1).lower():
                        print(f"   ✅ {var} configurado")
                    else:
                        warnings.append(f"⚠️ {var} parece vacío o con valor de ejemplo")
                        print(f"   ⚠️ {var} - necesita configurarse")
                else:
                    errors.append(f"❌ Falta {var} en .env")
                    print(f"   ❌ {var} - NO encontrado en .env")
        except Exception as e:
            warnings.append(f"⚠️ Error leyendo .env: {e}")
    else:
        errors.append("❌ Archivo .env no encontrado")
        print("   ❌ Archivo .env NO encontrado")
        if env_example.exists():
            print("   💡 Ejecuta: copy .env.example .env")
            print("   💡 Luego edita .env con tus credenciales de PostgreSQL")
        else:
            print("   💡 Crea un archivo .env con las variables de entorno")
    
    # 5. Verificar entorno virtual
    print("\n🐍 Verificando entorno Python...")
    print(f"   Python: {sys.executable}")
    print(f"   Versión: {sys.version}")
    
    in_venv = hasattr(sys, 'real_prefix') or (hasattr(sys, 'base_prefix') and sys.base_prefix != sys.prefix)
    if in_venv:
        print("   ✅ Ejecutando en entorno virtual")
    else:
        warnings.append("⚠️ No parece estar en un entorno virtual")
        print("   ⚠️ NO está en entorno virtual (recomendado usar venv)")
    
    # 5. Verificar si el paquete está instalado
    print("\n📥 Verificando instalación del paquete...")
    try:
        import pkg_resources
        try:
            dist = pkg_resources.get_distribution("sentiment-analyzer")
            print(f"   ✅ sentiment-analyzer instalado (versión {dist.version})")
            print(f"   📍 Ubicación: {dist.location}")
        except pkg_resources.DistributionNotFound:
            warnings.append("⚠️ Paquete 'sentiment-analyzer' no instalado. Ejecuta: pip install -e .")
            print("   ⚠️ sentiment-analyzer NO instalado")
            print("   💡 Ejecuta: pip install -e .")
    except ImportError:
        print("   ⚠️ No se pudo verificar (pkg_resources no disponible)")
    
    # 6. Verificar sys.path
    print("\n🔧 Verificando sys.path...")
    cwd_in_path = str(cwd) in sys.path or str(cwd) in [os.path.abspath(p) for p in sys.path]
    if cwd_in_path:
        print("   ✅ Directorio del proyecto en sys.path")
    else:
        print("   ⚠️ Directorio del proyecto NO está en sys.path")
        print(f"   💡 Agrega al inicio del script: sys.path.insert(0, r'{cwd}')")
    
    # 7. Intentar imports
    print("\n🧪 Probando imports...")
    
    # Agregar raíz al path para pruebas
    if str(cwd) not in sys.path:
        sys.path.insert(0, str(cwd))
    
    test_imports = [
        ("src", "Paquete principal"),
        ("src.database", "Módulo database"),
        ("src.utils", "Módulo utils"),
    ]
    
    for module, desc in test_imports:
        try:
            if "." in module and module.split(".")[-1][0].isupper():
                # Es una clase
                parts = module.rsplit(".", 1)
                mod = __import__(parts[0], fromlist=[parts[1]])
                getattr(mod, parts[1])
            else:
                __import__(module)
            print(f"   ✅ {module} - {desc}")
        except ImportError as e:
            errors.append(f"❌ Error importando {module}: {e}")
            print(f"   ❌ {module} - ERROR: {e}")
        except Exception as e:
            errors.append(f"❌ Error en {module}: {e}")
            print(f"   ❌ {module} - ERROR: {e}")
    
    # Resumen
    print("\n" + "=" * 60)
    print("📋 RESUMEN")
    print("=" * 60)
    
    if not errors and not warnings:
        print("\n✅ ¡Todo está configurado correctamente!")
    else:
        if warnings:
            print(f"\n⚠️ {len(warnings)} advertencia(s):")
            for w in warnings:
                print(f"   {w}")
        
        if errors:
            print(f"\n❌ {len(errors)} error(es):")
            for e in errors:
                print(f"   {e}")
            
            print("\n💡 SOLUCIÓN RECOMENDADA:")
            print("   1. Asegúrate de estar en la raíz del proyecto")
            print("   2. Activa tu entorno virtual: .\\venv\\Scripts\\activate")
            print("   3. Actualiza el código: git pull")
            print("   4. Reinstala el paquete: pip install -e .")
            print("   5. Vuelve a ejecutar este script")
    
    print("\n" + "=" * 60)
    return len(errors) == 0


if __name__ == "__main__":
    success = check_setup()
    sys.exit(0 if success else 1)
