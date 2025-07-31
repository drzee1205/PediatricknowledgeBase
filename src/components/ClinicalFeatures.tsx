'use client'

import { useState } from 'react'
import { Calculator, Stethoscope, Activity, Baby, AlertTriangle, CheckCircle, Brain, BookOpen, Heart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Textarea } from '@/components/ui/textarea'
import MarkdownRenderer from './MarkdownRenderer'

interface Drug {
  name: string
  dosage: string
  frequency: string
  maxDose: string
  notes: string
}

export default function ClinicalFeatures() {
  const [activeTab, setActiveTab] = useState<'calculator' | 'diagnosis' | 'treatment' | 'templates' | 'emergency' | 'education'>('calculator')
  const [weight, setWeight] = useState('')
  const [age, setAge] = useState('')
  const [selectedDrug, setSelectedDrug] = useState('')
  const [calculation, setCalculation] = useState<Drug | null>(null)
  
  // RAG-based features state
  const [symptoms, setSymptoms] = useState('')
  const [diagnosisAge, setDiagnosisAge] = useState('')
  const [diagnosisGender, setDiagnosisGender] = useState('')
  const [diagnosisResult, setDiagnosisResult] = useState('')
  const [isDiagnosisLoading, setIsDiagnosisLoading] = useState(false)
  
  const [treatmentCondition, setTreatmentCondition] = useState('')
  const [treatmentAge, setTreatmentAge] = useState('')
  const [treatmentWeight, setTreatmentWeight] = useState('')
  const [treatmentAllergies, setTreatmentAllergies] = useState('')
  const [treatmentSeverity, setTreatmentSeverity] = useState('')
  const [treatmentResult, setTreatmentResult] = useState('')
  const [isTreatmentLoading, setIsTreatmentLoading] = useState(false)
  
  const [educationTopic, setEducationTopic] = useState('')
  const [educationLevel, setEducationLevel] = useState('')
  const [educationType, setEducationType] = useState('')
  const [educationAudience, setEducationAudience] = useState('')
  const [educationResult, setEducationResult] = useState('')
  const [isEducationLoading, setIsEducationLoading] = useState(false)

  const commonDrugs = [
    {
      name: 'Acetaminophen',
      dosage: '10-15 mg/kg/dose',
      frequency: 'Every 4-6 hours',
      maxDose: '75 mg/kg/day, max 4000 mg/day',
      notes: 'For fever and pain. Monitor liver function in prolonged use.'
    },
    {
      name: 'Ibuprofen',
      dosage: '5-10 mg/kg/dose',
      frequency: 'Every 6-8 hours',
      maxDose: '40 mg/kg/day, max 2400 mg/day',
      notes: 'For fever and pain. Avoid in dehydration. Use with food.'
    },
    {
      name: 'Amoxicillin',
      dosage: '25-45 mg/kg/day',
      frequency: 'Every 12 hours',
      maxDose: '90 mg/kg/day',
      notes: 'For bacterial infections. Complete full course of treatment.'
    },
    {
      name: 'Albuterol',
      dosage: '0.1-0.3 mg/kg/dose',
      frequency: 'Every 4-6 hours as needed',
      maxDose: '2.5 mg per dose',
      notes: 'For asthma and wheezing. Monitor heart rate.'
    }
  ]

  // RAG-based functions
  const generateDifferentialDiagnosis = async () => {
    if (!symptoms || !diagnosisAge) return

    setIsDiagnosisLoading(true)
    try {
      const symptomsList = symptoms.split(',').map(s => s.trim()).filter(s => s)
      
      const response = await fetch('/api/rag/clinical/diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symptoms: symptomsList,
          patientAge: diagnosisAge,
          patientGender: diagnosisGender,
          useGemini: true,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setDiagnosisResult(data.diagnosis)
      } else {
        setDiagnosisResult('Error generating diagnosis. Please try again.')
      }
    } catch (error) {
      setDiagnosisResult('Network error. Please check your connection and try again.')
    } finally {
      setIsDiagnosisLoading(false)
    }
  }

  const generateTreatmentRecommendations = async () => {
    if (!treatmentCondition || !treatmentAge) return

    setIsTreatmentLoading(true)
    try {
      const response = await fetch('/api/rag/clinical/treatment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condition: treatmentCondition,
          patientAge: treatmentAge,
          patientWeight: treatmentWeight,
          allergies: treatmentAllergies ? treatmentAllergies.split(',').map(a => a.trim()) : [],
          currentMedications: [],
          severity: treatmentSeverity,
          useGemini: true,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setTreatmentResult(data.treatment)
      } else {
        setTreatmentResult('Error generating treatment recommendations. Please try again.')
      }
    } catch (error) {
      setTreatmentResult('Network error. Please check your connection and try again.')
    } finally {
      setIsTreatmentLoading(false)
    }
  }

  const generateMedicalEducation = async () => {
    if (!educationTopic) return

    setIsEducationLoading(true)
    try {
      const response = await fetch('/api/rag/education', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: educationTopic,
          difficultyLevel: educationLevel,
          contentType: educationType,
          targetAudience: educationAudience,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        setEducationResult(data.content)
      } else {
        setEducationResult('Error generating educational content. Please try again.')
      }
    } catch (error) {
      setEducationResult('Network error. Please check your connection and try again.')
    } finally {
      setIsEducationLoading(false)
    }
  }

  const emergencyProtocols = [
    {
      title: 'Pediatric Advanced Life Support (PALS)',
      category: 'Cardiac',
      ageGroup: 'All Ages',
      description: 'Cardiopulmonary resuscitation for pediatric patients',
      steps: [
        'Check responsiveness and breathing',
        'Call for help and activate emergency response',
        'Check pulse (brachial/femoral)',
        'Start chest compressions if no pulse',
        'Provide rescue breaths',
        'Use AED as soon as available',
        'Administer epinephrine if indicated'
      ]
    },
    {
      title: 'Anaphylaxis Management',
      category: 'Allergic',
      ageGroup: 'All Ages',
      description: 'Emergency management of severe allergic reactions',
      steps: [
        'Administer epinephrine IM (0.01 mg/kg, max 0.5 mg)',
        'Position patient supine with legs elevated',
        'Administer oxygen',
        'Establish IV access',
        'Give antihistamines and corticosteroids',
        'Monitor vital signs closely',
        'Prepare for advanced airway management'
      ]
    },
    {
      title: 'Febrile Seizure Management',
      category: 'Neurological',
      ageGroup: '6 months - 6 years',
      description: 'Management of febrile seizures in children',
      steps: [
        'Ensure airway patency and safety',
        'Position on side to prevent aspiration',
        'Do not restrain or put objects in mouth',
        'Monitor duration and characteristics',
        'Treat fever if present (acetaminophen/ibuprofen)',
        'Consider diagnostic workup for first seizure',
        'Parent education and reassurance'
      ]
    }
  ]

  const clinicalTemplates = [
    {
      title: 'Well Child Visit',
      category: 'Preventive',
      description: 'Template for routine well-child examinations',
      sections: ['Vital Signs', 'Growth Parameters', 'Developmental Assessment', 'Anticipatory Guidance', 'Immunizations']
    },
    {
      title: 'Asthma Assessment',
      category: 'Respiratory',
      description: 'Comprehensive asthma evaluation template',
      sections: ['Symptom Assessment', 'Asthma Control Test', 'Physical Exam', 'Spirometry', 'Medication Review', 'Action Plan']
    },
    {
      title: 'ADHD Evaluation',
      category: 'Neurodevelopmental',
      description: 'Template for ADHD assessment and management',
      sections: ['Behavioral History', 'Rating Scales', 'Physical Exam', 'Educational Assessment', 'Treatment Options', 'Follow-up Plan']
    }
  ]

  const calculateDosage = () => {
    if (!weight || !selectedDrug) return

    const drug = commonDrugs.find(d => d.name === selectedDrug)
    if (!drug) return

    const weightNum = parseFloat(weight)
    const dosageMatch = drug.dosage.match(/(\d+)-?(\d*)\s*mg\/kg/)
    
    if (dosageMatch) {
      const minDose = parseFloat(dosageMatch[1])
      const maxDose = dosageMatch[2] ? parseFloat(dosageMatch[2]) : minDose
      
      setCalculation({
        ...drug,
        dosage: `${(minDose * weightNum).toFixed(1)}-${(maxDose * weightNum).toFixed(1)} mg per dose`
      })
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Stethoscope className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">Clinical Tools</h1>
      </div>

      {/* Tab Navigation - Enhanced for mobile */}
      <div className="flex flex-wrap gap-2 mb-6">
        <Button
          variant={activeTab === 'calculator' ? 'default' : 'outline'}
          onClick={() => setActiveTab('calculator')}
          className="flex items-center gap-2 text-sm"
          size="sm"
        >
          <Calculator className="h-4 w-4" />
          <span className="hidden sm:inline">Drug Calculator</span>
          <span className="sm:hidden">Calculator</span>
        </Button>
        <Button
          variant={activeTab === 'diagnosis' ? 'default' : 'outline'}
          onClick={() => setActiveTab('diagnosis')}
          className="flex items-center gap-2 text-sm"
          size="sm"
        >
          <Brain className="h-4 w-4" />
          <span className="hidden sm:inline">AI Diagnosis</span>
          <span className="sm:hidden">Diagnosis</span>
        </Button>
        <Button
          variant={activeTab === 'treatment' ? 'default' : 'outline'}
          onClick={() => setActiveTab('treatment')}
          className="flex items-center gap-2 text-sm"
          size="sm"
        >
          <Heart className="h-4 w-4" />
          <span className="hidden sm:inline">AI Treatment</span>
          <span className="sm:hidden">Treatment</span>
        </Button>
        <Button
          variant={activeTab === 'templates' ? 'default' : 'outline'}
          onClick={() => setActiveTab('templates')}
          className="flex items-center gap-2 text-sm"
          size="sm"
        >
          <Activity className="h-4 w-4" />
          <span className="hidden sm:inline">Clinical Templates</span>
          <span className="sm:hidden">Templates</span>
        </Button>
        <Button
          variant={activeTab === 'emergency' ? 'default' : 'outline'}
          onClick={() => setActiveTab('emergency')}
          className="flex items-center gap-2 text-sm"
          size="sm"
        >
          <AlertTriangle className="h-4 w-4" />
          <span className="hidden sm:inline">Emergency</span>
          <span className="sm:hidden">ER</span>
        </Button>
        <Button
          variant={activeTab === 'education' ? 'default' : 'outline'}
          onClick={() => setActiveTab('education')}
          className="flex items-center gap-2 text-sm"
          size="sm"
        >
          <BookOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Medical Education</span>
          <span className="sm:hidden">Education</span>
        </Button>
      </div>

      {/* Drug Calculator */}
      {activeTab === 'calculator' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Pediatric Drug Dosage Calculator
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="Enter weight"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="age">Age Group</Label>
                <Select value={age} onValueChange={setAge}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select age group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="neonate">Neonate (0-1 month)</SelectItem>
                    <SelectItem value="infant">Infant (1-12 months)</SelectItem>
                    <SelectItem value="toddler">Toddler (1-3 years)</SelectItem>
                    <SelectItem value="child">Child (3-12 years)</SelectItem>
                    <SelectItem value="adolescent">Adolescent (12-18 years)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="drug">Medication</Label>
                <Select value={selectedDrug} onValueChange={setSelectedDrug}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select medication" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonDrugs.map((drug) => (
                      <SelectItem key={drug.name} value={drug.name}>
                        {drug.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button onClick={calculateDosage} disabled={!weight || !selectedDrug}>
              Calculate Dosage
            </Button>

            {calculation && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <h3 className="font-semibold">Dosage Calculation</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p><strong>Medication:</strong> {calculation.name}</p>
                    <p><strong>Calculated Dosage:</strong> {calculation.dosage}</p>
                    <p><strong>Frequency:</strong> {calculation.frequency}</p>
                    <p><strong>Maximum Daily Dose:</strong> {calculation.maxDose}</p>
                    <p><strong>Important Notes:</strong> {calculation.notes}</p>
                  </div>
                  <div className="mt-3 p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded text-xs">
                    <strong>Disclaimer:</strong> This calculator provides estimates only. Always verify dosages and consult appropriate references before administration.
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Clinical Templates */}
      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {clinicalTemplates.map((template, index) => (
            <Card key={index}>
              <CardHeader>
                <CardTitle className="text-lg">{template.title}</CardTitle>
                <Badge variant="secondary">{template.category}</Badge>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
                <Separator className="my-3" />
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Sections:</Label>
                  {template.sections.map((section, idx) => (
                    <div key={idx} className="text-xs text-muted-foreground">• {section}</div>
                  ))}
                </div>
                <Button className="w-full mt-4" size="sm">
                  Use Template
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Emergency Protocols */}
      {activeTab === 'emergency' && (
        <ScrollArea className="max-h-[600px]">
          <div className="space-y-4">
            {emergencyProtocols.map((protocol, index) => (
              <Card key={index}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg">{protocol.title}</CardTitle>
                      <div className="flex gap-2 mt-1">
                        <Badge variant="outline">{protocol.category}</Badge>
                        <Badge variant="secondary">{protocol.ageGroup}</Badge>
                      </div>
                    </div>
                    <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-3">{protocol.description}</p>
                  <Separator className="my-3" />
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Emergency Steps:</Label>
                    {protocol.steps.map((step, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-sm">
                        <span className="bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 p-2 bg-red-100 dark:bg-red-900/20 rounded text-xs">
                    <strong>Emergency:</strong> This protocol is for emergency situations only. Always call for immediate medical assistance.
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </ScrollArea>
      )}

      {/* AI Differential Diagnosis */}
      {activeTab === 'diagnosis' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI-Powered Differential Diagnosis
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="symptoms">Symptoms (comma-separated)</Label>
                <Textarea
                  id="symptoms"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g., fever, cough, wheezing, fatigue"
                  className="text-sm"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="diagnosis-age">Patient Age</Label>
                <Input
                  id="diagnosis-age"
                  value={diagnosisAge}
                  onChange={(e) => setDiagnosisAge(e.target.value)}
                  placeholder="e.g., 5 years"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="diagnosis-gender">Patient Gender (optional)</Label>
                <Select value={diagnosisGender} onValueChange={setDiagnosisGender}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button onClick={generateDifferentialDiagnosis} disabled={!symptoms || !diagnosisAge || isDiagnosisLoading}>
              {isDiagnosisLoading ? 'Generating...' : 'Generate Differential Diagnosis'}
            </Button>

            {diagnosisResult && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-5 w-5 text-blue-500" />
                    <h3 className="font-semibold">AI Differential Diagnosis</h3>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <MarkdownRenderer content={diagnosisResult} />
                  </div>
                  <div className="mt-3 p-2 bg-blue-100 dark:bg-blue-900/20 rounded text-xs">
                    <strong>AI Disclaimer:</strong> This diagnosis is generated by AI and should be used as a supportive tool. Always verify with clinical judgment and consult appropriate medical resources.
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Treatment Recommendations */}
      {activeTab === 'treatment' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              AI-Powered Treatment Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="condition">Medical Condition</Label>
                <Input
                  id="condition"
                  value={treatmentCondition}
                  onChange={(e) => setTreatmentCondition(e.target.value)}
                  placeholder="e.g., Pediatric Asthma"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="treatment-age">Patient Age</Label>
                <Input
                  id="treatment-age"
                  value={treatmentAge}
                  onChange={(e) => setTreatmentAge(e.target.value)}
                  placeholder="e.g., 8 years"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="treatment-weight">Patient Weight (optional)</Label>
                <Input
                  id="treatment-weight"
                  value={treatmentWeight}
                  onChange={(e) => setTreatmentWeight(e.target.value)}
                  placeholder="e.g., 25 kg"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="treatment-allergies">Allergies (comma-separated, optional)</Label>
                <Input
                  id="treatment-allergies"
                  value={treatmentAllergies}
                  onChange={(e) => setTreatmentAllergies(e.target.value)}
                  placeholder="e.g., penicillin, nuts"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="treatment-severity">Severity (optional)</Label>
                <Select value={treatmentSeverity} onValueChange={setTreatmentSeverity}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mild">Mild</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button onClick={generateTreatmentRecommendations} disabled={!treatmentCondition || !treatmentAge || isTreatmentLoading}>
              {isTreatmentLoading ? 'Generating...' : 'Generate Treatment Recommendations'}
            </Button>

            {treatmentResult && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    <h3 className="font-semibold">AI Treatment Recommendations</h3>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <MarkdownRenderer content={treatmentResult} />
                  </div>
                  <div className="mt-3 p-2 bg-red-100 dark:bg-red-900/20 rounded text-xs">
                    <strong>Treatment Disclaimer:</strong> These recommendations are AI-generated and should be verified with current medical guidelines and clinical judgment. Always consider individual patient factors.
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}

      {/* Medical Education */}
      {activeTab === 'education' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              AI-Powered Medical Education
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="education-topic">Medical Topic</Label>
                <Input
                  id="education-topic"
                  value={educationTopic}
                  onChange={(e) => setEducationTopic(e.target.value)}
                  placeholder="e.g., Pediatric Asthma Management"
                  className="text-sm"
                />
              </div>
              <div>
                <Label htmlFor="education-level">Difficulty Level</Label>
                <Select value={educationLevel} onValueChange={setEducationLevel}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="education-type">Content Type</Label>
                <Select value={educationType} onValueChange={setEducationType}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="overview">Overview</SelectItem>
                    <SelectItem value="deep_dive">Deep Dive</SelectItem>
                    <SelectItem value="case_study">Case Study</SelectItem>
                    <SelectItem value="q_and_a">Q&A</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="education-audience">Target Audience</Label>
                <Select value={educationAudience} onValueChange={setEducationAudience}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Select audience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="medical_students">Medical Students</SelectItem>
                    <SelectItem value="residents">Residents</SelectItem>
                    <SelectItem value="fellows">Fellows</SelectItem>
                    <SelectItem value="attendings">Attendings</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Button onClick={generateMedicalEducation} disabled={!educationTopic || isEducationLoading}>
              {isEducationLoading ? 'Generating...' : 'Generate Educational Content'}
            </Button>

            {educationResult && (
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <BookOpen className="h-5 w-5 text-green-500" />
                    <h3 className="font-semibold">AI-Generated Educational Content</h3>
                  </div>
                  <div className="prose prose-sm max-w-none">
                    <MarkdownRenderer content={educationResult} />
                  </div>
                  <div className="mt-3 p-2 bg-green-100 dark:bg-green-900/20 rounded text-xs">
                    <strong>Education Disclaimer:</strong> This content is AI-generated for educational purposes. Always verify with current medical literature and guidelines.
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}