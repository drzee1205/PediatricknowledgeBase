import { supabaseServiceBackend, TABLES } from '@/lib/supabase'

// Chat session operations
export const chatService = {
  // Create a new chat session
  async createSession(userId?: string, title?: string) {
    const result = await supabaseServiceBackend.storeChatSession({
      title: title || 'New Chat',
      user_id: userId,
    })
    return result.success ? result.data : null
  },

  // Get all chat sessions for a user
  async getUserSessions(userId?: string) {
    if (!userId) return []
    
    try {
      const { data, error } = await supabaseServiceBackend.client
        .from(TABLES.CHAT_SESSIONS)
        .select(`
          *,
          messages (
            id,
            content,
            role,
            created_at
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting user sessions:', error)
      return []
    }
  },

  // Get a single chat session with messages
  async getSession(sessionId: string) {
    try {
      const result = await supabaseServiceBackend.getChatSession(sessionId)
      return result.success ? result.data : null
    } catch (error) {
      console.error('Error getting session:', error)
      return null
    }
  },

  // Add a message to a session
  async addMessage(sessionId: string, content: string, role: string, citations?: string[]) {
    const result = await supabaseServiceBackend.storeChatMessage({
      session_id: sessionId,
      content,
      role: role as 'user' | 'assistant',
      metadata: citations ? { citations } : undefined,
    })
    return result.success ? result.data : null
  },

  // Update session title
  async updateSessionTitle(sessionId: string, title: string) {
    try {
      const { data, error } = await supabaseServiceBackend.client
        .from(TABLES.CHAT_SESSIONS)
        .update({ title })
        .eq('id', sessionId)
        .select()
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error updating session title:', error)
      return null
    }
  },

  // Delete a session
  async deleteSession(sessionId: string) {
    try {
      // Delete messages first
      await supabaseServiceBackend.client
        .from(TABLES.CHAT_MESSAGES)
        .delete()
        .eq('session_id', sessionId)

      // Then delete session
      const { error } = await supabaseServiceBackend.client
        .from(TABLES.CHAT_SESSIONS)
        .delete()
        .eq('id', sessionId)

      return !error
    } catch (error) {
      console.error('Error deleting session:', error)
      return false
    }
  },
}

// Nelson Textbook reference operations
export const nelsonService = {
  // Search Nelson references by keywords
  async searchReferences(query: string) {
    // Mock implementation for now
    return [
      {
        id: '1',
        title: 'Pediatric Pneumonia',
        chapter: '1',
        content: 'Pneumonia is a common respiratory infection in children. Community-acquired pneumonia (CAP) is typically caused by bacteria such as Streptococcus pneumoniae, Haemophilus influenzae, and Mycoplasma pneumoniae. Viral causes include respiratory syncytial virus (RSV), influenza, and parainfluenza viruses.',
        edition: '21st',
        pageNumbers: '123-145'
      },
      {
        id: '2',
        title: 'Respiratory Infections in Children',
        chapter: '2',
        content: 'Lower respiratory tract infections are a leading cause of morbidity and mortality in children worldwide. Pneumonia accounts for approximately 15% of all deaths in children under 5 years of age.',
        edition: '21st',
        pageNumbers: '200-220'
      },
      {
        id: '3',
        title: 'Antibiotic Therapy for Pediatric Infections',
        chapter: '3',
        content: 'Antibiotic selection for pediatric pneumonia should be based on the likely causative organisms, local resistance patterns, and the child\'s age and clinical presentation. Amoxicillin is often first-line for uncomplicated bacterial pneumonia.',
        edition: '21st',
        pageNumbers: '350-370'
      }
    ]
  },

  // Get reference by ID
  async getReference(id: string) {
    // Mock implementation
    return {
      id: id,
      title: 'Pediatric Pneumonia',
      chapter: '1',
      content: 'Pneumonia is a common respiratory infection in children. Community-acquired pneumonia (CAP) is typically caused by bacteria such as Streptococcus pneumoniae, Haemophilus influenzae, and Mycoplasma pneumoniae. Viral causes include respiratory syncytial virus (RSV), influenza, and parainfluenza viruses.',
      edition: '21st',
      pageNumbers: '123-145'
    }
  },

  // Get references by chapter
  async getReferencesByChapter(chapter: string) {
    // Mock implementation
    return [
      {
        id: '1',
        title: 'Pediatric Pneumonia',
        chapter: chapter,
        content: 'Pneumonia is a common respiratory infection in children. Community-acquired pneumonia (CAP) is typically caused by bacteria such as Streptococcus pneumoniae, Haemophilus influenzae, and Mycoplasma pneumoniae. Viral causes include respiratory syncytial virus (RSV), influenza, and parainfluenza viruses.',
        edition: '21st',
        pageNumbers: '123-145'
      }
    ]
  },
}

// Clinical templates operations
export const templateService = {
  // Get all clinical templates
  async getTemplates(category?: string) {
    try {
      let query = supabaseServiceBackend.client
        .from('clinical_templates')
        .select('*')

      if (category) {
        query = query.eq('category', category)
      }

      const { data, error } = await query.order('title', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting templates:', error)
      return []
    }
  },

  // Get template by ID
  async getTemplate(id: string) {
    try {
      const { data, error } = await supabaseServiceBackend.client
        .from('clinical_templates')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting template:', error)
      return null
    }
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
    try {
      const { data: result, error } = await supabaseServiceBackend.client
        .from('clinical_templates')
        .insert([data])
        .select()
        .single()

      if (error) throw error
      return result
    } catch (error) {
      console.error('Error creating template:', error)
      return null
    }
  },
}

// Drug dosage operations
export const drugService = {
  // Get drug dosages by drug name
  async getDrugDosages(drugName: string) {
    try {
      const { data, error } = await supabaseServiceBackend.client
        .from('drug_dosages')
        .select('*')
        .ilike('drug_name', `%${drugName}%`)
        .order('age_group', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting drug dosages:', error)
      return []
    }
  },

  // Get drug dosages by indication
  async getDosagesByIndication(indication: string) {
    try {
      const { data, error } = await supabaseServiceBackend.client
        .from('drug_dosages')
        .select('*')
        .ilike('indication', `%${indication}%`)
        .order('drug_name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting dosages by indication:', error)
      return []
    }
  },

  // Calculate dosage based on weight
  async calculateDosage(drugName: string, weight: number, ageGroup: string) {
    try {
      const { data, error } = await supabaseServiceBackend.client
        .from('drug_dosages')
        .select('*')
        .ilike('drug_name', `%${drugName}%`)
        .eq('age_group', ageGroup)
        .single()

      if (error) throw error
      if (!data) return null

      // Parse dosage string (e.g., "10-15 mg/kg/day")
      const dosageMatch = data.dosage.match(/(\d+)-?(\d*)\s*mg\/kg\/?(\w*)/)
      if (!dosageMatch) return null

      const minDose = parseFloat(dosageMatch[1])
      const maxDose = dosageMatch[2] ? parseFloat(dosageMatch[2]) : minDose
      const unit = dosageMatch[3] || 'day'

      return {
        minDose: minDose * weight,
        maxDose: maxDose * weight,
        unit,
        frequency: data.frequency,
        maxDosage: data.max_dosage,
        notes: data.notes,
        citations: data.citations,
      }
    } catch (error) {
      console.error('Error calculating dosage:', error)
      return null
    }
  },
}

// Emergency protocols operations
export const emergencyService = {
  // Get emergency protocols by category
  async getProtocolsByCategory(category: string) {
    try {
      const { data, error } = await supabaseServiceBackend.client
        .from('emergency_protocols')
        .select('*')
        .eq('category', category)
        .order('title', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting protocols by category:', error)
      return []
    }
  },

  // Get protocol by ID
  async getProtocol(id: string) {
    try {
      const { data, error } = await supabaseServiceBackend.client
        .from('emergency_protocols')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting protocol:', error)
      return null
    }
  },

  // Get protocols by age group
  async getProtocolsByAgeGroup(ageGroup: string) {
    try {
      const { data, error } = await supabaseServiceBackend.client
        .from('emergency_protocols')
        .select('*')
        .eq('age_group', ageGroup)
        .order('category', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting protocols by age group:', error)
      return []
    }
  },
}

// Developmental milestones operations
export const milestoneService = {
  // Get milestones by age range
  async getMilestonesByAge(ageRange: string) {
    try {
      const { data, error } = await supabaseServiceBackend.client
        .from('developmental_milestones')
        .select('*')
        .eq('age_range', ageRange)
        .order('domain', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting milestones by age:', error)
      return []
    }
  },

  // Get milestones by domain
  async getMilestonesByDomain(domain: string) {
    try {
      const { data, error } = await supabaseServiceBackend.client
        .from('developmental_milestones')
        .select('*')
        .eq('domain', domain)
        .order('age_range', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting milestones by domain:', error)
      return []
    }
  },

  // Get all milestones
  async getAllMilestones() {
    try {
      const { data, error } = await supabaseServiceBackend.client
        .from('developmental_milestones')
        .select('*')
        .order('age_range', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting all milestones:', error)
      return []
    }
  },
}

// Vaccine schedule operations
export const vaccineService = {
  // Get vaccine schedule by age
  async getVaccinesByAge(age: string) {
    try {
      const { data, error } = await supabaseServiceBackend.client
        .from('vaccine_schedule')
        .select('*')
        .ilike('age', `%${age}%`)
        .order('vaccine_name', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting vaccines by age:', error)
      return []
    }
  },

  // Get vaccine schedule by vaccine name
  async getVaccineSchedule(vaccineName: string) {
    try {
      const { data, error } = await supabaseServiceBackend.client
        .from('vaccine_schedule')
        .select('*')
        .ilike('vaccine_name', `%${vaccineName}%`)
        .order('age', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting vaccine schedule:', error)
      return []
    }
  },

  // Get complete vaccine schedule
  async getCompleteSchedule() {
    try {
      const { data, error } = await supabaseServiceBackend.client
        .from('vaccine_schedule')
        .select('*')
        .order('age', { ascending: true })

      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Error getting complete vaccine schedule:', error)
      return []
    }
  },
}

// User settings operations
export const settingsService = {
  // Get user settings
  async getUserSettings(userId: string) {
    try {
      let { data, error } = await supabaseServiceBackend.client
        .from('user_settings')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Create default settings if not found
        const { data: newSettings, error: createError } = await supabaseServiceBackend.client
          .from('user_settings')
          .insert([{ user_id: userId }])
          .select()
          .single()

        if (createError) throw createError
        return newSettings
      }

      if (error) throw error
      return data
    } catch (error) {
      console.error('Error getting user settings:', error)
      return null
    }
  },

  // Update user settings
  async updateSettings(userId: string, data: Partial<{
    theme: string
    show_citations: boolean
    show_timestamps: boolean
    auto_save_chats: boolean
    voice_input_enabled: boolean
    notifications_enabled: boolean
    language: string
  }>) {
    try {
      const { data: result, error } = await supabaseServiceBackend.client
        .from('user_settings')
        .upsert([{ user_id: userId, ...data }])
        .select()
        .single()

      if (error) throw error
      return result
    } catch (error) {
      console.error('Error updating user settings:', error)
      return null
    }
  },
}