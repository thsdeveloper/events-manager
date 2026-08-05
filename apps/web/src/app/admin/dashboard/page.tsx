import { Calendar, Users, TrendingUp, DollarSign, Ticket, Eye, MapPin, Clock } from 'lucide-react';
import Link from 'next/link';
import {Button} from "@/components/ui/button";

export default function DashboardPage() {
	return (
		<div className="space-y-6">
			{/* Welcome Section */}
			<div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
				<h1 className="text-3xl font-bold mb-2">
					Bem-vindo de volta! 👋
				</h1>
				<p className="text-purple-100">
					Aqui está um resumo das suas atividades recentes
				</p>
			</div>
			<>
				<Button>Teste de button</Button>
			</>

			{/* Stats Grid */}
			<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
				<StatsCard
					title="Total de Eventos"
					value="12"
					icon={Calendar}
					trend="+2 este mês"
					trendUp
					color="purple"
				/>
				<StatsCard
					title="Participantes"
					value="1,234"
					icon={Users}
					trend="+180 esta semana"
					trendUp
					color="blue"
				/>
				<StatsCard
					title="Ingressos Vendidos"
					value="856"
					icon={Ticket}
					trend="+124 hoje"
					trendUp
					color="green"
				/>
				<StatsCard
					title="Receita Total"
					value="R$ 45,2k"
					icon={DollarSign}
					trend="+12% vs. mês anterior"
					trendUp
					color="amber"
				/>
			</div>

			{/* Charts and Tables Row */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Quick Stats */}
				<div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
					<h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
						Estatísticas Rápidas
					</h2>
					<div className="space-y-4">
						<QuickStat
							icon={Eye}
							label="Visualizações de Eventos"
							value="3,456"
							change="+15%"
						/>
						<QuickStat
							icon={Ticket}
							label="Taxa de Conversão"
							value="68%"
							change="+5%"
						/>
						<QuickStat
							icon={Users}
							label="Novos Cadastros"
							value="234"
							change="+23%"
						/>
						<QuickStat
							icon={TrendingUp}
							label="Ticket Médio"
							value="R$ 52,80"
							change="+8%"
						/>
					</div>
				</div>

				{/* Upcoming Events */}
				<div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-lg font-bold text-gray-900 dark:text-white">
							Próximos Eventos
						</h2>
						<Link
							href="/admin/eventos"
							className="text-sm text-purple-600 dark:text-purple-400 hover:underline font-medium"
						>
							Ver todos
						</Link>
					</div>
					<div className="space-y-4">
						<EventCard
							title="DevConf Brasil 2025"
							date="15 de Janeiro, 2025"
							location="São Paulo, SP"
							participants={234}
							status="active"
						/>
						<EventCard
							title="Workshop React & Next.js"
							date="20 de Janeiro, 2025"
							location="Online"
							participants={89}
							status="active"
						/>
						<EventCard
							title="Festival Música Indie"
							date="25 de Janeiro, 2025"
							location="Rio de Janeiro, RJ"
							participants={567}
							status="pending"
						/>
					</div>
				</div>
			</div>

			{/* Recent Activity */}
			<div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
				<h2 className="text-lg font-bold text-gray-900 dark:text-white mb-6">
					Atividade Recente
				</h2>
				<div className="space-y-4">
					<ActivityItem
						icon={Ticket}
						title="Nova venda de ingresso"
						description="DevConf Brasil 2025 - Ingresso VIP"
						time="Há 5 minutos"
					/>
					<ActivityItem
						icon={Users}
						title="Novo participante"
						description="João Silva se inscreveu em Workshop React"
						time="Há 12 minutos"
					/>
					<ActivityItem
						icon={Calendar}
						title="Evento atualizado"
						description="Festival Música Indie teve detalhes atualizados"
						time="Há 1 hora"
					/>
					<ActivityItem
						icon={DollarSign}
						title="Pagamento recebido"
						description="R$ 250,00 - Lote 1 - DevConf"
						time="Há 2 horas"
					/>
				</div>
			</div>
		</div>
	);
}

interface StatsCardProps {
	title: string;
	value: string;
	icon: React.ElementType;
	trend: string;
	trendUp: boolean;
	color: 'purple' | 'blue' | 'green' | 'amber';
}

function StatsCard({ title, value, icon: Icon, trend, trendUp, color }: StatsCardProps) {
	const colorClasses = {
		purple: 'from-purple-500 to-indigo-600',
		blue: 'from-blue-500 to-cyan-600',
		green: 'from-green-500 to-emerald-600',
		amber: 'from-amber-500 to-orange-600',
	};

	return (
		<div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:shadow-lg transition-shadow duration-300">
			<div className="flex items-start justify-between">
				<div className="flex-1">
					<p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">{title}</p>
					<p className="text-3xl font-bold text-gray-900 dark:text-white">
						{value}
					</p>
				</div>
				<div className={`p-3 rounded-xl bg-gradient-to-r ${colorClasses[color]} shadow-lg`}>
					<Icon className="size-6 text-white" />
				</div>
			</div>
			<div className="mt-4 flex items-center gap-2">
				<span className={`text-sm font-semibold ${trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
					{trend}
				</span>
			</div>
		</div>
	);
}

interface QuickStatProps {
	icon: React.ElementType;
	label: string;
	value: string;
	change: string;
}

function QuickStat({ icon: Icon, label, value, change }: QuickStatProps) {
	return (
		<div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
			<div className="flex items-center gap-3">
				<div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
					<Icon className="size-5 text-purple-600 dark:text-purple-400" />
				</div>
				<div>
					<p className="text-sm font-medium text-gray-900 dark:text-white">{label}</p>
					<p className="text-xs text-gray-500 dark:text-gray-400">{change} vs. anterior</p>
				</div>
			</div>
			<p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
		</div>
	);
}

interface EventCardProps {
	title: string;
	date: string;
	location: string;
	participants: number;
	status: 'active' | 'pending' | 'completed';
}

function EventCard({ title, date, location, participants, status }: EventCardProps) {
	const statusColors = {
		active: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400',
		pending: 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
		completed: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400',
	};

	const statusText = {
		active: 'Ativo',
		pending: 'Pendente',
		completed: 'Concluído',
	};

	return (
		<div className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
			<div className="flex-1 min-w-0">
				<h3 className="font-semibold text-gray-900 dark:text-white mb-2">{title}</h3>
				<div className="flex flex-col gap-1">
					<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
						<Clock className="size-4" />
						<span>{date}</span>
					</div>
					<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
						<MapPin className="size-4" />
						<span>{location}</span>
					</div>
					<div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
						<Users className="size-4" />
						<span>{participants} participantes</span>
					</div>
				</div>
			</div>
			<span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[status]}`}>
				{statusText[status]}
			</span>
		</div>
	);
}

interface ActivityItemProps {
	icon: React.ElementType;
	title: string;
	description: string;
	time: string;
}

function ActivityItem({ icon: Icon, title, description, time }: ActivityItemProps) {
	return (
		<div className="flex items-start gap-4 py-3 border-b border-gray-100 dark:border-gray-800 last:border-0">
			<div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
				<Icon className="size-5 text-gray-600 dark:text-gray-400" />
			</div>
			<div className="flex-1 min-w-0">
				<p className="font-medium text-gray-900 dark:text-white">{title}</p>
				<p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
			</div>
			<span className="text-xs text-gray-500 dark:text-gray-500 whitespace-nowrap">{time}</span>
		</div>
	);
}
