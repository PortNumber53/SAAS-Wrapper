"use client"

export const runtime = 'edge';

export default function DashboardPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-4">Dashboard Overview</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold text-gray-600">Total Revenue</h3>
          <p className="text-3xl font-bold text-blue-600">$42,567</p>
          <p className="text-sm text-gray-500 mt-2">Last 30 days</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold text-gray-600">Active Products</h3>
          <p className="text-3xl font-bold text-green-600">98</p>
          <p className="text-sm text-gray-500 mt-2">In catalog</p>
        </div>
        <div className="bg-white p-4 rounded shadow">
          <h3 className="font-semibold text-gray-600">Pending Orders</h3>
          <p className="text-3xl font-bold text-yellow-600">42</p>
          <p className="text-sm text-gray-500 mt-2">Awaiting shipment</p>
        </div>
      </div>
    </div>
  )
}
