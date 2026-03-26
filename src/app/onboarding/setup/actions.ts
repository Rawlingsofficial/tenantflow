'use server'

import { createServerClient } from '@/lib/supabase/server'

export async function savePropertyType({
  orgId,
  orgName,
  propertyType,
}: {
  orgId: string
  orgName: string
  propertyType: 'residential' | 'commercial'
}): Promise<{ error: string | null }> {
  try {
    const supabase = createServerClient()

    const { error } = await supabase
      .from('organizations')
      .upsert(
        {
          id: orgId,
          name: orgName,
          property_type: propertyType,
          plan_type: 'free',
          status: 'active',
        },
        { onConflict: 'id' }
      )

    if (error) {
      console.error('[savePropertyType] upsert error:', error)
      return { error: error.message }
    }

    return { error: null }
  } catch (err) {
    console.error('[savePropertyType] unexpected error:', err)
    return { error: 'Internal server error' }
  }
}
