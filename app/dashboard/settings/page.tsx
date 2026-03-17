'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'

export default function SettingsPage() {
  const [formData, setFormData] = useState({
    businessName: '',
    email: '',
    category: 'apparel',
  })

  useEffect(() => {
    setFormData({
      businessName: window.localStorage.getItem('business_name') || '',
      email: window.localStorage.getItem('email') || '',
      category: window.localStorage.getItem('category') || 'apparel',
    })
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSave = () => {
    window.localStorage.setItem('business_name', formData.businessName)
    window.localStorage.setItem('email', formData.email)
    window.localStorage.setItem('category', formData.category)
    alert('Settings saved!')
  }

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">Settings</h1>

      <div className="space-y-6">
        {/* Business Profile */}
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Business Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Business Name</label>
              <input
                type="text"
                name="businessName"
                value={formData.businessName}
                onChange={handleChange}
                placeholder="Your brand name"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Product Category</label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-border rounded-lg bg-background text-foreground"
              >
                <option value="apparel">Apparel & Streetwear</option>
                <option value="accessories">Accessories</option>
                <option value="footwear">Footwear</option>
                <option value="sportswear">Sportswear</option>
                <option value="luxury">Luxury Fashion</option>
              </select>
            </div>
          </div>
        </div>

        {/* Data Management */}
        <div className="border border-border rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Data Management</h2>
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              All your projects are stored locally on this device.
            </p>
            <Button
              variant="outline"
              className="text-destructive"
              onClick={() => {
                if (window.confirm('Clear all data? This cannot be undone.')) {
                  window.localStorage.clear()
                  window.location.reload()
                }
              }}
            >
              Clear All Data
            </Button>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-4">
          <Button onClick={handleSave}>Save Changes</Button>
          <Button variant="outline">Cancel</Button>
        </div>
      </div>
    </div>
  )
}
