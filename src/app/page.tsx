'use client'

import { useState } from 'react'
import FileUpload from '@/components/FileUpload'
import RuleEditor from '@/components/RuleEditor'
import DataPreview from '@/components/DataPreview'
import OrderList from '@/components/OrderList'
import { ParseRule, Order, ValidationError, ParseResult } from '@/types'
import { Upload, List, Wand2 } from 'lucide-react'

export default function Home() {
  const [activeTab, setActiveTab] = useState<'import' | 'orders'>('import')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [rules, setRules] = useState<ParseRule[]>([])
  const [currentRule, setCurrentRule] = useState<ParseRule | null>(null)
  const [parsedData, setParsedData] = useState<Order[]>([])
  const [errors, setErrors] = useState<ValidationError[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [isParsing, setIsParsing] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileSelect = (file: File) => {
    setSelectedFile(file)
    setParsedData([])
    setErrors([])
  }

  const handleGenerateAIRule = async () => {
    if (!selectedFile) {
      alert('请先上传文件')
      return
    }

    setIsGenerating(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)

      const fileType = selectedFile.name.endsWith('.xlsx') || selectedFile.name.endsWith('.xls')
        ? 'excel'
        : selectedFile.name.endsWith('.docx')
        ? 'word'
        : 'pdf'
      formData.append('fileType', fileType)

      const response = await fetch('/api/ai/generate-rule', {
        method: 'POST',
        body: formData
      })

      const data = await response.json()
      if (response.ok) {
        setCurrentRule(data.rule)
      } else {
        alert(data.error || 'AI 生成规则失败')
      }
    } catch (error) {
      console.error('AI rule generation error:', error)
      alert('AI 生成规则失败')
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSaveRule = async (rule: ParseRule) => {
    try {
      const response = await fetch('/api/rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rule)
      })

      if (response.ok) {
        const savedRule = await response.json()
        setRules(prev => [...prev, savedRule])
        setCurrentRule(savedRule)
        alert('规则保存成功')
      }
    } catch (error) {
      console.error('Save rule error:', error)
      alert('规则保存失败')
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    try {
      const response = await fetch(`/api/rules/${ruleId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        setRules(prev => prev.filter(r => r.id !== ruleId))
        setCurrentRule(null)
      }
    } catch (error) {
      console.error('Delete rule error:', error)
    }
  }

  const handleParse = async () => {
    if (!selectedFile || !currentRule) {
      alert('请先上传文件并选择规则')
      return
    }

    setIsParsing(true)
    setProgress(0)

    try {
      // 模拟解析进度
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90))
      }, 100)

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('rule', JSON.stringify(currentRule))

      const response = await fetch('/api/parse', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setProgress(100)

      const result: ParseResult = await response.json()
      if (response.ok) {
        setParsedData(result.data)
        setErrors(result.errors.map(e => ({
          row: e.row,
          field: 'general',
          message: e.message
        })))
      } else {
        alert('解析失败')
      }
    } catch (error) {
      console.error('Parse error:', error)
      alert('解析失败')
    } finally {
      setIsParsing(false)
    }
  }

  const handleSubmit = async () => {
    if (parsedData.length === 0) {
      alert('没有可提交的数据')
      return
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orders: parsedData,
          ruleId: currentRule?.id
        })
      })

      const result = await response.json()
      if (response.ok) {
        alert(`提交成功：${result.count} 条`)
        setParsedData([])
      } else {
        alert(result.error || '提交失败')
      }
    } catch (error) {
      console.error('Submit error:', error)
      alert('提交失败')
    }
  }

  const handleExport = () => {
    // TODO: 导出为 Excel
    alert('导出功能待实现')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-[#0fc6c2]">万能导入 V2</h1>
              <span className="ml-2 text-sm text-gray-500">智能多格式批量下单系统</span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('import')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  activeTab === 'import'
                    ? 'bg-[#0fc6c2] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Upload className="w-4 h-4" />
                文件导入
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                  activeTab === 'orders'
                    ? 'bg-[#0fc6c2] text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <List className="w-4 h-4" />
                已导入运单
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'import' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">上传文件</h2>
                <FileUpload onFileSelect={handleFileSelect} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">解析规则</h2>
                <RuleEditor
                  rule={currentRule}
                  onSave={handleSaveRule}
                  onDelete={handleDeleteRule}
                  onGenerateAI={handleGenerateAIRule}
                  isGenerating={isGenerating}
                />
              </div>
            </div>

            {selectedFile && currentRule && (
              <div className="flex justify-center">
                <button
                  onClick={handleParse}
                  disabled={isParsing}
                  className="px-6 py-3 bg-[#0fc6c2] text-white rounded-lg hover:bg-[#0db5b1] disabled:bg-gray-300 flex items-center gap-2 text-lg"
                >
                  {isParsing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      解析中... {progress}%
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-5 h-5" />
                      开始解析
                    </>
                  )}
                </button>
              </div>
            )}

            {parsedData.length > 0 && (
              <DataPreview
                data={parsedData}
                errors={errors}
                onDataChange={setParsedData}
                onSubmit={handleSubmit}
                onExport={handleExport}
              />
            )}
          </div>
        ) : (
          <OrderList onExport={handleExport} />
        )}
      </main>
    </div>
  )
}
