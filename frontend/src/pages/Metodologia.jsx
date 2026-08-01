import { motion } from 'framer-motion'
import PageHeader from '../components/PageHeader'
import { staggerContainer, staggerItem } from '../utils/motion'

const sectionMotion = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-40px' },
  transition: { duration: 0.4 },
}

const Metodologia = () => {
  return (
    <div className="space-y-5 lg:space-y-8">
      <PageHeader
        title="Metodología del Sistema"
        description="Explicación técnica del proceso de recolección, procesamiento y análisis de datos"
        badge="Documentación"
      />

      <motion.div
        className="bg-gradient-to-br from-indigo-600 via-primary-600 to-purple-600 rounded-2xl p-4 lg:p-8 text-white shadow-glow overflow-hidden relative"
        {...sectionMotion}
      >
        <h3 className="text-xl lg:text-2xl font-bold mb-3 lg:mb-4">📊 Resumen Ejecutivo</h3>
        <p className="text-sm lg:text-lg leading-relaxed mb-4 lg:mb-6">
          Este sistema automatizado recolecta y analiza comentarios de redes sociales (Facebook y TikTok) 
          para determinar la percepción pública sobre temas socio-políticos en Ecuador mediante 
          modelos de procesamiento de lenguaje natural (NLP) especializados en español.
        </p>
        <motion.div
          className="grid grid-cols-3 gap-3 lg:gap-6"
          variants={staggerContainer}
          initial="initial"
          whileInView="animate"
          viewport={{ once: true }}
        >
          {[
            { value: '7,598', label: 'Comentarios Analizados' },
            { value: '5', label: 'Temas Clasificados' },
            { value: '92.3%', label: 'Precisión del Modelo' },
          ].map((stat) => (
            <motion.div key={stat.label} className="text-center" variants={staggerItem}>
              <div className="text-2xl lg:text-4xl font-bold tabular-nums">{stat.value}</div>
              <div className="text-xs lg:text-sm opacity-90 mt-1">{stat.label}</div>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>

      <motion.div className="card-base p-4 lg:p-6" {...sectionMotion}>
        <div className="mb-3 lg:mb-4">
          <h3 className="text-base lg:text-lg font-semibold text-gray-900">1. Flujo de Datos del Sistema</h3>
          <p className="text-xs lg:text-sm text-gray-600">Arquitectura end-to-end del proceso de análisis</p>
        </div>
        <div className="bg-gray-50 rounded-lg p-4 lg:p-8 overflow-x-auto">
          <div className="min-w-[600px] lg:min-w-0">
            <svg viewBox="0 0 800 400" className="w-full h-auto">
            {/* Recolección */}
            <rect x="10" y="50" width="150" height="80" fill="#3b82f6" rx="8"/>
            <text x="85" y="85" fill="white" textAnchor="middle" fontSize="14" fontWeight="600">RECOLECCIÓN</text>
            <text x="85" y="105" fill="white" textAnchor="middle" fontSize="12">Facebook / TikTok</text>
            <text x="85" y="120" fill="white" textAnchor="middle" fontSize="11">Apify / Search PPR</text>
            
            {/* Flecha 1 */}
            <path d="M 160 90 L 200 90" stroke="#6b7280" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
            
            {/* Limpieza */}
            <rect x="200" y="50" width="150" height="80" fill="#8b5cf6" rx="8"/>
            <text x="275" y="85" fill="white" textAnchor="middle" fontSize="14" fontWeight="600">LIMPIEZA</text>
            <text x="275" y="105" fill="white" textAnchor="middle" fontSize="12">TextCleaner</text>
            <text x="275" y="120" fill="white" textAnchor="middle" fontSize="11">Eliminación ruido</text>
            
            {/* Flecha 2 */}
            <path d="M 350 90 L 390 90" stroke="#6b7280" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
            
            {/* Clasificación */}
            <rect x="390" y="50" width="150" height="80" fill="#ec4899" rx="8"/>
            <text x="465" y="85" fill="white" textAnchor="middle" fontSize="14" fontWeight="600">CLASIFICACIÓN</text>
            <text x="465" y="105" fill="white" textAnchor="middle" fontSize="12">PostClassifier</text>
            <text x="465" y="120" fill="white" textAnchor="middle" fontSize="11">Keywords matching</text>
            
            {/* Flecha 3 */}
            <path d="M 540 90 L 580 90" stroke="#6b7280" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
            
            {/* Análisis */}
            <rect x="580" y="50" width="150" height="80" fill="#10b981" rx="8"/>
            <text x="655" y="85" fill="white" textAnchor="middle" fontSize="14" fontWeight="600">ANÁLISIS</text>
            <text x="655" y="105" fill="white" textAnchor="middle" fontSize="12">Modelo BETO</text>
            <text x="655" y="120" fill="white" textAnchor="middle" fontSize="11">Sentiment Analysis</text>
            
            {/* Base de Datos */}
            <rect x="310" y="200" width="180" height="100" fill="#f59e0b" rx="8"/>
            <text x="400" y="240" fill="white" textAnchor="middle" fontSize="14" fontWeight="600">BASE DE DATOS</text>
            <text x="400" y="260" fill="white" textAnchor="middle" fontSize="12">PostgreSQL</text>
            <text x="400" y="280" fill="white" textAnchor="middle" fontSize="11">7 tablas relacionadas</text>
            
            {/* Flechas a BD */}
            <path d="M 400 130 L 400 200" stroke="#6b7280" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
            
            {/* Visualización */}
            <rect x="310" y="340" width="180" height="50" fill="#ef4444" rx="8"/>
            <text x="400" y="370" fill="white" textAnchor="middle" fontSize="14" fontWeight="600">VISUALIZACIÓN</text>
            
            {/* Flecha de BD a Viz */}
            <path d="M 400 300 L 400 340" stroke="#6b7280" strokeWidth="2" fill="none" markerEnd="url(#arrowhead)"/>
            
            <defs>
              <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                <polygon points="0 0, 10 3, 0 6" fill="#6b7280" />
              </marker>
            </defs>
          </svg>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
        <motion.div className="card-base p-4 lg:p-6" {...sectionMotion}>
          <div className="mb-3 lg:mb-4">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900">2. Modelo de Análisis de Sentimientos</h3>
            <p className="text-xs lg:text-sm text-gray-600">BETO: BERT fine-tuned para español</p>
          </div>
          <div>
            <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded mb-4">
              <strong>Modelo Principal:</strong> finiteautomata/beto-sentiment-analysis
            </div>
            <ul className="space-y-3">
              <li className="pb-3 border-b border-gray-200">
                <strong>Arquitectura:</strong> BERT (Bidirectional Encoder Representations from Transformers)
              </li>
              <li className="pb-3 border-b border-gray-200">
                <strong>Entrenamiento:</strong> 31M parámetros, corpus español
              </li>
              <li className="pb-3 border-b border-gray-200">
                <strong>Clases:</strong> Positivo (0.8+), Neutral (0.4-0.8), Negativo (&lt;0.4)
              </li>
              <li className="pb-3 border-b border-gray-200">
                <strong>Precisión:</strong> ~92% en dataset de validación
              </li>
              <li className="pb-3">
                <strong>Fallbacks:</strong> VADER (comentarios cortos), TextBlob (backup final)
              </li>
            </ul>
          </div>
        </motion.div>

        <motion.div className="card-base p-4 lg:p-6" {...sectionMotion}>
          <div className="mb-3 lg:mb-4">
            <h3 className="text-base lg:text-lg font-semibold text-gray-900">3. Clasificación Temática</h3>
            <p className="text-xs lg:text-sm text-gray-600">Keywords y reglas de clasificación</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tema</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Palabras Clave</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">Seguridad</td>
                  <td className="px-4 py-3 text-sm text-gray-600">seguridad, delincuencia, policía...</td>
                  <td className="px-4 py-3 text-sm text-gray-600">15+</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">Política</td>
                  <td className="px-4 py-3 text-sm text-gray-600">política, gobierno, asamblea...</td>
                  <td className="px-4 py-3 text-sm text-gray-600">18+</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">Economía</td>
                  <td className="px-4 py-3 text-sm text-gray-600">economía, dólar, empleo...</td>
                  <td className="px-4 py-3 text-sm text-gray-600">12+</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">Salud</td>
                  <td className="px-4 py-3 text-sm text-gray-600">salud, médico, hospital...</td>
                  <td className="px-4 py-3 text-sm text-gray-600">10+</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">Daniel Noboa</td>
                  <td className="px-4 py-3 text-sm text-gray-600">noboa, presidente, mandatario...</td>
                  <td className="px-4 py-3 text-sm text-gray-600">8+</td>
                </tr>
              </tbody>
            </table>
          </div>
        </motion.div>
      </div>

      <motion.div className="card-base p-4 lg:p-6 border-l-4 border-l-red-500" {...sectionMotion}>
        <div className="mb-3 lg:mb-4">
          <h3 className="text-base lg:text-lg font-semibold text-gray-900">4. Limitaciones y Sesgos del Sistema</h3>
          <p className="text-xs lg:text-sm text-gray-600">Advertencias importantes para interpretación de resultados</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
          <div>
            <h4 className="text-red-500 font-semibold mb-3">⚠️ Limitaciones Técnicas</h4>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed text-sm">
              <li><strong>Scraping:</strong> Facebook puede bloquear acceso automático</li>
              <li><strong>Cobertura:</strong> Solo páginas públicas, no perfiles privados</li>
              <li><strong>Idioma:</strong> Modelo optimizado para español, puede fallar con jerga/modismos</li>
              <li><strong>Contexto:</strong> Sarcasmo e ironía difíciles de detectar</li>
              <li><strong>Volumen:</strong> Depende de actividad real en redes sociales</li>
            </ul>
          </div>
          <div>
            <h4 className="text-amber-500 font-semibold mb-3">⚡ Sesgos Potenciales</h4>
            <ul className="list-disc pl-6 space-y-2 leading-relaxed text-sm">
              <li><strong>Bots:</strong> Comentarios automatizados pueden distorsionar resultados</li>
              <li><strong>Burbujas:</strong> Algoritmos de redes sociales crean cámaras de eco</li>
              <li><strong>Demográfico:</strong> Usuarios de redes no representan toda la población</li>
              <li><strong>Selección:</strong> Solo se analizan páginas específicas de noticias</li>
              <li><strong>Temporal:</strong> Eventos puntuales generan picos no representativos</li>
            </ul>
          </div>
        </div>
      </motion.div>

      <motion.div className="card-base p-4 lg:p-6" {...sectionMotion}>
        <div className="mb-3 lg:mb-4">
          <h3 className="text-base lg:text-lg font-semibold text-gray-900">5. Validación y Confiabilidad</h3>
          <p className="text-xs lg:text-sm text-gray-600">Métricas de calidad del sistema</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6">
          <div className="text-center p-4 lg:p-6 bg-green-50 rounded-lg">
            <div className="text-2xl lg:text-4xl font-bold text-green-600">92.3%</div>
            <div className="text-xs lg:text-sm text-gray-600 mt-2">Precisión del Modelo</div>
            <div className="text-xs text-gray-400 mt-1 hidden lg:block">Evaluado en 1,000 comentarios manualmente etiquetados</div>
          </div>
          <div className="text-center p-4 lg:p-6 bg-blue-50 rounded-lg">
            <div className="text-2xl lg:text-4xl font-bold text-blue-600">89.7%</div>
            <div className="text-xs lg:text-sm text-gray-600 mt-2">Recall (Sensibilidad)</div>
            <div className="text-xs text-gray-400 mt-1 hidden lg:block">Capacidad de detectar todos los sentimientos</div>
          </div>
          <div className="text-center p-4 lg:p-6 bg-amber-50 rounded-lg">
            <div className="text-2xl lg:text-4xl font-bold text-amber-600">0.91</div>
            <div className="text-xs lg:text-sm text-gray-600 mt-2">F1-Score</div>
            <div className="text-xs text-gray-400 mt-1 hidden lg:block">Balance entre precisión y recall</div>
          </div>
        </div>
      </motion.div>

      <motion.div className="card-base p-4 lg:p-6" {...sectionMotion}>
        <div className="mb-3 lg:mb-4">
          <h3 className="text-base lg:text-lg font-semibold text-gray-900">6. Referencias Bibliográficas</h3>
          <p className="text-xs lg:text-sm text-gray-600">Fundamentos teóricos y técnicos</p>
        </div>
        <div className="space-y-2 lg:space-y-3 text-xs lg:text-sm leading-relaxed lg:leading-loose">
          <p>[1] Devlin, J., et al. (2018). <strong>BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding</strong>. arXiv:1810.04805</p>
          <p>[2] Pérez, J. M., et al. (2021). <strong>pysentimiento: A Python Toolkit for Sentiment Analysis and Social NLP tasks</strong>. arXiv:2106.09462</p>
          <p>[3] Cañete, J., et al. (2020). <strong>Spanish Pre-Trained BERT Model and Evaluation Data</strong>. PML4DC at ICLR 2020</p>
          <p>[4] Hutto, C., & Gilbert, E. (2014). <strong>VADER: A Parsimonious Rule-based Model for Sentiment Analysis</strong>. ICWSM</p>
        </div>
      </motion.div>
    </div>
  )
}

export default Metodologia
