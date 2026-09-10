import { DollarSign, Package, ShoppingBag, Users, TrendingUp, ArrowUp } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatPrice, formatDate, getStatusColor } from '@/lib/utils'
import prisma from '@/lib/prisma'

async function getStats() {
  const [
    totalRevenue,
    totalOrders,
    totalProducts,
    totalCustomers,
    recentOrders,
  ] = await Promise.all([
    prisma.order.aggregate({ _sum: { total: true }, where: { paymentStatus: 'PAID' } }),
    prisma.order.count(),
    prisma.product.count({ where: { published: true } }),
    prisma.user.count({ where: { role: 'USER' } }),
    prisma.order.findMany({
      take: 8,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { name: true, email: true } }, items: true },
    }),
  ])
  return { totalRevenue: totalRevenue._sum.total || 0, totalOrders, totalProducts, totalCustomers, recentOrders }
}

export default async function AdminDashboard() {
  const { totalRevenue, totalOrders, totalProducts, totalCustomers, recentOrders } = await getStats()

  const stats = [
    { title: 'Total Revenue', value: formatPrice(totalRevenue), icon: DollarSign, change: '+12.5%', color: 'text-green-600 bg-green-50' },
    { title: 'Total Orders', value: totalOrders.toLocaleString(), icon: ShoppingBag, change: '+8.2%', color: 'text-blue-600 bg-blue-50' },
    { title: 'Products', value: totalProducts.toLocaleString(), icon: Package, change: '+3.1%', color: 'text-purple-600 bg-purple-50' },
    { title: 'Customers', value: totalCustomers.toLocaleString(), icon: Users, change: '+18.7%', color: 'text-orange-600 bg-orange-50' },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1">Welcome back, here&apos;s what&apos;s happening today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold mt-1">{stat.value}</p>
                  <div className="flex items-center gap-1 mt-2">
                    <ArrowUp className="h-3 w-3 text-green-600" />
                    <span className="text-xs font-medium text-green-600">{stat.change}</span>
                    <span className="text-xs text-muted-foreground">vs last month</span>
                  </div>
                </div>
                <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                  <stat.icon className="h-5 w-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground">
                  <th className="pb-3 font-medium">Order</th>
                  <th className="pb-3 font-medium">Customer</th>
                  <th className="pb-3 font-medium">Items</th>
                  <th className="pb-3 font-medium">Total</th>
                  <th className="pb-3 font-medium">Status</th>
                  <th className="pb-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 font-mono text-xs">{order.orderNumber}</td>
                    <td className="py-3">
                      <p className="font-medium">{order.user.name}</p>
                      <p className="text-xs text-muted-foreground">{order.user.email}</p>
                    </td>
                    <td className="py-3 text-muted-foreground">{order.items.length}</td>
                    <td className="py-3 font-semibold">{formatPrice(order.total)}</td>
                    <td className="py-3">
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="py-3 text-muted-foreground text-xs">{formatDate(order.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
