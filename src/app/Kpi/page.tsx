import React from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  Users, 
  DollarSign, 
  ShoppingCart, 
  Activity,
  Target,
  Clock,
  BarChart3,
  Eye,
  Heart,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Minus
} from 'lucide-react';

const KPIDashboard = () => {
  // Mock KPI data
  const kpiData = [
    {
      id: 1,
      title: "Total Revenue",
      value: "$2,847,392",
      change: "+12.5%",
      trend: "up",
      icon: DollarSign,
      color: "blue",
      period: "vs last month"
    },
    {
      id: 2,
      title: "Active Users",
      value: "45,321",
      change: "+8.2%",
      trend: "up",
      icon: Users,
      color: "green",
      period: "vs last month"
    },
    {
      id: 3,
      title: "Conversion Rate",
      value: "3.24%",
      change: "-0.5%",
      trend: "down",
      icon: Target,
      color: "red",
      period: "vs last month"
    },
    {
      id: 4,
      title: "Avg. Order Value",
      value: "$127.50",
      change: "+2.1%",
      trend: "up",
      icon: ShoppingCart,
      color: "purple",
      period: "vs last month"
    },
    {
      id: 5,
      title: "Page Views",
      value: "892,143",
      change: "+15.3%",
      trend: "up",
      icon: Eye,
      color: "orange",
      period: "vs last month"
    },
    {
      id: 6,
      title: "Response Time",
      value: "1.2s",
      change: "-0.3s",
      trend: "up",
      icon: Clock,
      color: "teal",
      period: "vs last month"
    }
  ];

  const detailedKPIs = [
    {
      title: "Sales Performance",
      metrics: [
        { label: "Monthly Sales", value: "$485,290", change: "+18.2%" },
        { label: "Quarterly Goal", value: "87%", change: "+5.1%" },
        { label: "YTD Revenue", value: "$4.2M", change: "+23.8%" }
      ],
      icon: BarChart3,
      color: "blue"
    },
    {
      title: "Customer Metrics",
      metrics: [
        { label: "New Customers", value: "1,247", change: "+12.5%" },
        { label: "Customer Retention", value: "94.2%", change: "+2.1%" },
        { label: "Churn Rate", value: "5.8%", change: "-1.3%" }
      ],
      icon: Heart,
      color: "pink"
    },
    {
      title: "Product Analytics",
      metrics: [
        { label: "Product Views", value: "52,891", change: "+8.7%" },
        { label: "Cart Additions", value: "3,429", change: "+15.2%" },
        { label: "Checkout Rate", value: "68.5%", change: "+4.3%" }
      ],
      icon: Activity,
      color: "indigo"
    }
  ];

  const getTrendIcon = (trend: string) => {
    if (trend === "up") return <ArrowUpRight className="w-4 h-4" />;
    if (trend === "down") return <ArrowDownRight className="w-4 h-4" />;
    return <Minus className="w-4 h-4" />;
  };

  const getTrendColor = (trend: string) => {
    if (trend === "up") return "text-green-600";
    if (trend === "down") return "text-red-600";
    return "text-gray-600";
  };

  const getColorClasses = (color: string) => {
    const colors = {
      blue: "bg-blue-500 text-blue-600 bg-blue-50",
      green: "bg-green-500 text-green-600 bg-green-50",
      red: "bg-red-500 text-red-600 bg-red-50",
      purple: "bg-purple-500 text-purple-600 bg-purple-50",
      orange: "bg-orange-500 text-orange-600 bg-orange-50",
      teal: "bg-teal-500 text-teal-600 bg-teal-50",
      pink: "bg-pink-500 text-pink-600 bg-pink-50",
      indigo: "bg-indigo-500 text-indigo-600 bg-indigo-50"
    };
    return colors[color as keyof typeof colors] || colors.blue;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">KPI Dashboard</h1>
          <p className="text-gray-600">Monitor your key performance indicators in real-time</p>
        </div>

        {/* Main KPI Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {kpiData.map((kpi) => {
            const IconComponent = kpi.icon;
            const colorClasses = getColorClasses(kpi.color).split(' ');
            
            return (
              <div key={kpi.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${colorClasses[2]}`}>
                    <IconComponent className={`w-6 h-6 ${colorClasses[1]}`} />
                  </div>
                  <div className={`flex items-center space-x-1 px-2 py-1 rounded-full text-sm font-medium ${getTrendColor(kpi.trend)}`}>
                    {getTrendIcon(kpi.trend)}
                    <span>{kpi.change}</span>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-600">{kpi.title}</h3>
                  <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                  <p className="text-xs text-gray-500">{kpi.period}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Detailed KPI Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {detailedKPIs.map((section, index) => {
            const IconComponent = section.icon;
            const colorClasses = getColorClasses(section.color).split(' ');
            
            return (
              <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center space-x-3 mb-6">
                  <div className={`p-2 rounded-lg ${colorClasses[2]}`}>
                    <IconComponent className={`w-5 h-5 ${colorClasses[1]}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                </div>
                
                <div className="space-y-4">
                  {section.metrics.map((metric, metricIndex) => (
                    <div key={metricIndex} className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{metric.value}</p>
                        <p className="text-xs text-gray-500">{metric.label}</p>
                      </div>
                      <div className={`text-sm font-medium ${metric.change.startsWith('+') ? 'text-green-600' : metric.change.startsWith('-') ? 'text-red-600' : 'text-gray-600'}`}>
                        {metric.change}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Large Feature Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Revenue Trend Card */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Monthly Revenue Trend</h3>
              <TrendingUp className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold">$2,847,392</p>
              <p className="text-blue-100">+12.5% from last month</p>
              <div className="mt-4 flex space-x-4 text-sm">
                <div>
                  <p className="text-blue-100">Last Month</p>
                  <p className="font-semibold">$2,532,180</p>
                </div>
                <div>
                  <p className="text-blue-100">Target</p>
                  <p className="font-semibold">$3,000,000</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Satisfaction Card */}
          <div className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Customer Satisfaction</h3>
              <Star className="w-6 h-6" />
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-bold">4.8/5.0</p>
              <p className="text-green-100">Based on 2,847 reviews</p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-green-100">5 Star</span>
                  <span className="font-semibold">82%</span>
                </div>
                <div className="w-full bg-green-800 rounded-full h-2">
                  <div className="bg-white h-2 rounded-full" style={{ width: '82%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">98.5%</p>
            <p className="text-sm text-gray-600">Uptime</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">1.2M</p>
            <p className="text-sm text-gray-600">Total Users</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">247</p>
            <p className="text-sm text-gray-600">Support Tickets</p>
          </div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">15.3%</p>
            <p className="text-sm text-gray-600">Growth Rate</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KPIDashboard;