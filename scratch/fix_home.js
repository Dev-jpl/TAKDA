const load = useCallback(async (cancelled = false) => {
    try {
      // Get the expense_tracker module definition id
      const { data: def } = await supabase
        .from('module_definitions')
        .select('id')
        .eq('slug', 'expense_tracker')
        .single()
      if (!def?.id || cancelled) return

      // Fetch all entries for this hub + global
      let q = supabase
        .from('module_entries')
        .select('data')
        .eq('module_def_id', def.id)
        .order('created_at', { ascending: false })

      if (hubId && hubId !== 'null' && hubId !== 'all') {
        q = q.eq('hub_id', hubId)
      }

      const { data } = await q
      if (!cancelled) setEntries(data ?? [])
    } catch (e) {
      console.warn('ExpenseTrackerWidget load error:', e)
    } finally {
      if (!cancelled) setLoading(false)
    }
  }, [hubId])
