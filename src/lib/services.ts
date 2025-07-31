import { db } from '@/lib/db'

// Chat session operations
export const chatService = {
  // Create a new chat session
  async createSession(userId?: string, title?: string) {
    return await db.chatSession.create({
      data: {
        userId,
        title: title || 'New Chat',
      },
    })
  },

  // Get all chat sessions for a user
  async getUserSessions(userId?: string) {
    if (!userId) return []
    return await db.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 1, // Just get first message for preview
        },
      },
    })
  },

  // Get a single chat session with messages
  async getSession(sessionId: string) {
    return await db.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    })
  },

  // Add a message to a session
  async addMessage(sessionId: string, content: string, role: string, citations?: string[]) {
    return await db.message.create({
      data: {
        sessionId,
        content,
        role,
        citations: citations ? JSON.stringify(citations) : null,
      },
    })
  },

  // Update session title
  async updateSessionTitle(sessionId: string, title: string) {
    return await db.chatSession.update({
      where: { id: sessionId },
      data: { title },
    })
  },

  // Delete a session
  async deleteSession(sessionId: string) {
    return await db.chatSession.delete({
      where: { id: sessionId },
    })
  },
}

// Nelson Textbook reference operations
export const nelsonService = {
  // Search Nelson references by keywords
  async searchReferences(query: string) {
    const queryLower = query.toLowerCase()
    return await db.nelsonReference.findMany({
      where: {
        OR: [
          {
            title: {
              contains: queryLower,
            },
          },
          {
            content: {
              contains: queryLower,
            },
          },
          {
            keywords: {
              contains: queryLower,
            },
          },
        ],
      },
      orderBy: { chapter: 'asc' },
    })
  },

  // Get reference by ID
  async getReference(id: string) {
    return await db.nelsonReference.findUnique({
      where: { id },
    })
  },

  // Get references by chapter
  async getReferencesByChapter(chapter: string) {
    return await db.nelsonReference.findMany({
      where: { chapter },
      orderBy: { section: 'asc' },
    })
  },
}

// Clinical templates operations
export const templateService = {
  // Get all clinical templates
  async getTemplates(category?: string) {
    const where = category ? { category } : {}
    return await db.clinicalTemplate.findMany({
      where,
      orderBy: { title: 'asc' },
    })
  },

  // Get template by ID
  async getTemplate(id: string) {
    return await db.clinicalTemplate.findUnique({
      where: { id },
    })
  },

  // Create new template
  async createTemplate(data: {
    title: string
    category: string
    description?: string
    template: string
    tags?: string
    isPublic?: boolean
  }) {
    return await db.clinicalTemplate.create({
      data,
    })
  },
}

// Drug dosage operations
export const drugService = {
  // Get drug dosages by drug name
  async getDrugDosages(drugName: string) {
    const drugNameLower = drugName.toLowerCase()
    return await db.drugDosage.findMany({
      where: {
        drugName: {
          contains: drugNameLower,
        },
      },
      orderBy: { ageGroup: 'asc' },
    })
  },

  // Get drug dosages by indication
  async getDosagesByIndication(indication: string) {
    const indicationLower = indication.toLowerCase()
    return await db.drugDosage.findMany({
      where: {
        indication: {
          contains: indicationLower,
        },
      },
      orderBy: { drugName: 'asc' },
    })
  },

  // Calculate dosage based on weight
  async calculateDosage(drugName: string, weight: number, ageGroup: string) {
    const drugNameLower = drugName.toLowerCase()
    const dosage = await db.drugDosage.findFirst({
      where: {
        drugName: {
          contains: drugNameLower,
        },
        ageGroup,
      },
    })

    if (!dosage) return null

    // Parse dosage string (e.g., "10-15 mg/kg/day")
    const dosageMatch = dosage.dosage.match(/(\d+)-?(\d*)\s*mg\/kg\/?(\w*)/)
    if (!dosageMatch) return null

    const minDose = parseFloat(dosageMatch[1])
    const maxDose = dosageMatch[2] ? parseFloat(dosageMatch[2]) : minDose
    const unit = dosageMatch[3] || 'day'

    return {
      minDose: minDose * weight,
      maxDose: maxDose * weight,
      unit,
      frequency: dosage.frequency,
      maxDosage: dosage.maxDosage,
      notes: dosage.notes,
      citations: dosage.citations,
    }
  },
}

// Emergency protocols operations
export const emergencyService = {
  // Get emergency protocols by category
  async getProtocolsByCategory(category: string) {
    return await db.emergencyProtocol.findMany({
      where: { category },
      orderBy: { title: 'asc' },
    })
  },

  // Get protocol by ID
  async getProtocol(id: string) {
    return await db.emergencyProtocol.findUnique({
      where: { id },
    })
  },

  // Get protocols by age group
  async getProtocolsByAgeGroup(ageGroup: string) {
    return await db.emergencyProtocol.findMany({
      where: { ageGroup },
      orderBy: { category: 'asc' },
    })
  },
}

// Developmental milestones operations
export const milestoneService = {
  // Get milestones by age range
  async getMilestonesByAge(ageRange: string) {
    return await db.developmentalMilestone.findMany({
      where: { ageRange },
      orderBy: { domain: 'asc' },
    })
  },

  // Get milestones by domain
  async getMilestonesByDomain(domain: string) {
    return await db.developmentalMilestone.findMany({
      where: { domain },
      orderBy: { ageRange: 'asc' },
    })
  },

  // Get all milestones
  async getAllMilestones() {
    return await db.developmentalMilestone.findMany({
      orderBy: [
        { ageRange: 'asc' },
        { domain: 'asc' },
      ],
    })
  },
}

// Vaccine schedule operations
export const vaccineService = {
  // Get vaccine schedule by age
  async getVaccinesByAge(age: string) {
    const ageLower = age.toLowerCase()
    return await db.vaccineSchedule.findMany({
      where: {
        age: {
          contains: ageLower,
        },
      },
      orderBy: { vaccineName: 'asc' },
    })
  },

  // Get vaccine schedule by vaccine name
  async getVaccineSchedule(vaccineName: string) {
    const vaccineNameLower = vaccineName.toLowerCase()
    return await db.vaccineSchedule.findMany({
      where: {
        vaccineName: {
          contains: vaccineNameLower,
        },
      },
      orderBy: { age: 'asc' },
    })
  },

  // Get complete vaccine schedule
  async getCompleteSchedule() {
    return await db.vaccineSchedule.findMany({
      orderBy: [
        { age: 'asc' },
        { doseNumber: 'asc' },
      ],
    })
  },
}

// User settings operations
export const settingsService = {
  // Get user settings
  async getUserSettings(userId: string) {
    let settings = await db.userSettings.findUnique({
      where: { userId },
    })

    // Create default settings if not found
    if (!settings) {
      settings = await db.userSettings.create({
        data: { userId },
      })
    }

    return settings
  },

  // Update user settings
  async updateSettings(userId: string, data: Partial<{
    theme: string
    showCitations: boolean
    showTimestamps: boolean
    autoSaveChats: boolean
    voiceInputEnabled: boolean
    notificationsEnabled: boolean
    language: string
  }>) {
    return await db.userSettings.upsert({
      where: { userId },
      update: data,
      create: { userId, ...data },
    })
  },
}