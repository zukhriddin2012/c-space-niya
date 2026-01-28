'use client';

import { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Phone, Mail, MessageCircle, Search, Loader2, AlertCircle, Users, Minus } from 'lucide-react';

interface OrgNode {
  id: string;
  employeeId: string;
  name: string;
  position: string;
  email?: string;
  phone?: string;
  telegramId?: string;
  photo?: string;
  level: string;
  managerId?: string;
  departmentId?: string;
  departmentName?: string;
  branchId?: string;
  branchName?: string;
  children?: OrgNode[];
}

interface OrgStats {
  totalEmployees: number;
  departments: number;
  managers: number;
  roots: number;
}

// Get color based on hierarchy level
const getLevelColor = (depth: number, isLeader: boolean) => {
  if (isLeader) return {
    bg: 'bg-gradient-to-br from-purple-600 to-purple-700',
    border: 'border-purple-200',
    text: 'text-purple-600',
    line: 'border-purple-300',
    dot: 'bg-purple-400',
    badge: 'bg-purple-100 text-purple-700'
  };

  const colors = [
    { bg: 'bg-blue-500', border: 'border-blue-200', text: 'text-blue-600', line: 'border-blue-300', dot: 'bg-blue-400', badge: 'bg-blue-100 text-blue-700' },
    { bg: 'bg-teal-500', border: 'border-teal-200', text: 'text-teal-600', line: 'border-teal-300', dot: 'bg-teal-400', badge: 'bg-teal-100 text-teal-700' },
    { bg: 'bg-amber-500', border: 'border-amber-200', text: 'text-amber-600', line: 'border-amber-300', dot: 'bg-amber-400', badge: 'bg-amber-100 text-amber-700' },
    { bg: 'bg-rose-500', border: 'border-rose-200', text: 'text-rose-600', line: 'border-rose-300', dot: 'bg-rose-400', badge: 'bg-rose-100 text-rose-700' },
    { bg: 'bg-indigo-500', border: 'border-indigo-200', text: 'text-indigo-600', line: 'border-indigo-300', dot: 'bg-indigo-400', badge: 'bg-indigo-100 text-indigo-700' },
  ];
  return colors[depth % colors.length];
};

// Org Node Card Component
function OrgNodeCard({
  node,
  depth = 0,
  isRoot = false,
  searchQuery = '',
  expandedNodes,
  toggleNode,
  allEmployees
}: {
  node: OrgNode;
  depth?: number;
  isRoot?: boolean;
  searchQuery?: string;
  expandedNodes: Set<string>;
  toggleNode: (id: string) => void;
  allEmployees: OrgNode[];
}) {
  const [showContact, setShowContact] = useState(false);
  const hasChildren = node.children && node.children.length > 0;
  const isExpanded = expandedNodes.has(node.id);
  const colors = getLevelColor(depth, isRoot);

  const initials = node.name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const isHighlighted = searchQuery &&
    (node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     node.position.toLowerCase().includes(searchQuery.toLowerCase()));

  const childCount = node.children?.length || 0;

  return (
    <div className="flex flex-col items-center">
      {/* Card */}
      <div
        className={`relative ${isRoot
          ? 'bg-gradient-to-br from-purple-600 to-purple-700 text-white rounded-2xl p-4 shadow-xl min-w-[240px]'
          : `bg-white rounded-xl p-3 shadow-lg border-2 ${colors.border} min-w-[200px] hover:shadow-xl transition-all`
        } ${isHighlighted ? 'ring-2 ring-yellow-400' : ''}`}
        onMouseEnter={() => setShowContact(true)}
        onMouseLeave={() => setShowContact(false)}
      >
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`${isRoot ? 'w-12 h-12 bg-white/20' : `w-11 h-11 ${colors.bg}`} rounded-xl flex items-center justify-center text-white font-bold shadow`}>
            {node.photo ? (
              <img src={node.photo} alt={node.name} className="w-full h-full rounded-xl object-cover" />
            ) : (
              <span className={isRoot ? 'text-lg' : 'text-sm'}>{initials}</span>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className={`font-semibold truncate ${isRoot ? 'text-white' : 'text-gray-900'}`}>
              {node.name}
            </div>
            <div className={`text-sm truncate ${isRoot ? 'text-purple-200' : colors.text}`}>
              {node.position}
            </div>
            {node.departmentName && !isRoot && (
              <div className="text-xs text-gray-400 truncate">{node.departmentName}</div>
            )}
          </div>

          {/* Reports badge */}
          {childCount > 0 && (
            <div className={`${isRoot ? 'bg-white/20 text-white' : colors.badge} px-2 py-1 rounded-lg text-center`}>
              <div className="text-sm font-bold">{childCount}</div>
              <div className={`text-xs ${isRoot ? 'text-purple-200' : ''}`}>reports</div>
            </div>
          )}
        </div>

        {/* Contact buttons on hover */}
        {showContact && (node.phone || node.email || node.telegramId) && (
          <div className={`flex items-center gap-1 mt-2 pt-2 ${isRoot ? 'border-t border-white/20' : 'border-t border-gray-100'}`}>
            {node.phone && (
              <a href={`tel:${node.phone}`} className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg transition-colors ${isRoot ? 'text-purple-200 hover:bg-white/10' : 'text-gray-500 hover:text-green-600 hover:bg-green-50'}`}>
                <Phone size={12} />
                <span>Call</span>
              </a>
            )}
            {node.email && (
              <a href={`mailto:${node.email}`} className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg transition-colors ${isRoot ? 'text-purple-200 hover:bg-white/10' : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'}`}>
                <Mail size={12} />
                <span>Email</span>
              </a>
            )}
            {node.telegramId && (
              <a href={`https://t.me/${node.telegramId}`} target="_blank" rel="noopener noreferrer" className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs rounded-lg transition-colors ${isRoot ? 'text-purple-200 hover:bg-white/10' : 'text-gray-500 hover:text-purple-600 hover:bg-purple-50'}`}>
                <MessageCircle size={12} />
                <span>TG</span>
              </a>
            )}
          </div>
        )}

        {/* Expand/Collapse button */}
        {hasChildren && (
          <button
            onClick={() => toggleNode(node.id)}
            className={`absolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full border-2 flex items-center justify-center shadow transition-all hover:scale-110 ${
              isRoot
                ? 'bg-purple-600 border-white text-white'
                : `bg-white ${colors.border} ${colors.text}`
            }`}
          >
            {isExpanded ? <Minus size={12} /> : <ChevronDown size={12} />}
          </button>
        )}
      </div>

      {/* Children */}
      {hasChildren && isExpanded && (
        <>
          {/* Vertical dotted line */}
          <div className={`h-8 border-l-2 border-dashed ${colors.line}`}></div>

          {/* Horizontal connector with dots */}
          {node.children!.length > 1 && (
            <div className="relative flex items-center">
              <div className={`h-0.5 border-t-2 border-dashed ${colors.line}`} style={{ width: `${Math.min(node.children!.length * 220, 880)}px` }}></div>
              {node.children!.map((_, idx) => (
                <div
                  key={idx}
                  className={`absolute w-2 h-2 ${colors.dot} rounded-full -translate-y-1/2`}
                  style={{ left: `${(idx / (node.children!.length - 1)) * 100}%`, transform: 'translate(-50%, -50%)' }}
                ></div>
              ))}
            </div>
          )}

          {/* Children cards */}
          <div className="flex gap-4 mt-0">
            {node.children!.map((child, idx) => (
              <div key={child.id} className="flex flex-col items-center">
                {/* Vertical line to child */}
                <div className={`h-6 border-l-2 border-dashed ${getLevelColor(depth + 1, false).line}`}></div>
                <OrgNodeCard
                  node={child}
                  depth={depth + 1}
                  searchQuery={searchQuery}
                  expandedNodes={expandedNodes}
                  toggleNode={toggleNode}
                  allEmployees={allEmployees}
                />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [orgTree, setOrgTree] = useState<OrgNode[]>([]);
  const [flatList, setFlatList] = useState<OrgNode[]>([]);
  const [stats, setStats] = useState<OrgStats>({ totalEmployees: 0, departments: 0, managers: 0, roots: 0 });
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchOrgData();
  }, []);

  const fetchOrgData = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/org-chart');
      if (!res.ok) throw new Error('Failed to fetch org data');
      const data = await res.json();
      setOrgTree(data.tree || []);
      setFlatList(data.flat || []);
      setStats(data.stats || { totalEmployees: 0, departments: 0, managers: 0, roots: 0 });

      // Auto-expand root nodes
      const rootIds = new Set((data.tree || []).map((n: OrgNode) => n.id));
      setExpandedNodes(rootIds);
    } catch (err) {
      setError('Failed to load organization data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleNode = (id: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allIds = new Set<string>();
    const addIds = (nodes: OrgNode[]) => {
      nodes.forEach(node => {
        allIds.add(node.id);
        if (node.children) addIds(node.children);
      });
    };
    addIds(orgTree);
    setExpandedNodes(allIds);
  };

  const collapseAll = () => {
    // Keep only root nodes expanded
    const rootIds = new Set(orgTree.map(n => n.id));
    setExpandedNodes(rootIds);
  };

  // Filter tree based on search
  const filterTree = (nodes: OrgNode[], query: string): OrgNode[] => {
    if (!query) return nodes;

    return nodes.map(node => {
      const matchesSearch =
        node.name.toLowerCase().includes(query.toLowerCase()) ||
        node.position.toLowerCase().includes(query.toLowerCase());

      const filteredChildren = node.children ? filterTree(node.children, query) : [];

      if (matchesSearch || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    }).filter(Boolean) as OrgNode[];
  };

  const filteredTree = filterTree(orgTree, searchQuery);

  // Calculate levels for stats
  const getMaxDepth = (nodes: OrgNode[], depth = 1): number => {
    if (!nodes.length) return depth - 1;
    return Math.max(...nodes.map(n => n.children?.length ? getMaxDepth(n.children, depth + 1) : depth));
  };
  const maxDepth = getMaxDepth(orgTree);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
          <p className="text-gray-500">Loading organization chart...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="w-8 h-8 text-red-500" />
          <p className="text-gray-700">{error}</p>
          <button
            onClick={fetchOrgData}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Organization Chart</h1>
        <p className="text-gray-500">View company structure and reporting hierarchy</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white rounded-xl p-4 shadow-sm border border-gray-100">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search employee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64 pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-1"
          >
            <ChevronDown size={14} />
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors flex items-center gap-1"
          >
            <ChevronRight size={14} />
            Collapse
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-gray-900">{stats.totalEmployees}</div>
          <div className="text-sm text-gray-500">Total Employees</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-purple-600">{stats.departments}</div>
          <div className="text-sm text-gray-500">Departments</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-blue-600">{stats.managers}</div>
          <div className="text-sm text-gray-500">Managers</div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="text-2xl font-bold text-teal-600">{maxDepth}</div>
          <div className="text-sm text-gray-500">Levels Deep</div>
        </div>
      </div>

      {/* Org Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 overflow-x-auto">
        {filteredTree.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">No employees found</p>
            {searchQuery ? (
              <p className="text-sm text-gray-400 mt-1">Try adjusting your search</p>
            ) : (
              <p className="text-sm text-gray-400 mt-1">Set manager relationships to build the org chart</p>
            )}
          </div>
        ) : (
          <div className="flex justify-center gap-8 min-w-max pb-8">
            {filteredTree.map((root) => (
              <OrgNodeCard
                key={root.id}
                node={root}
                isRoot
                searchQuery={searchQuery}
                expandedNodes={expandedNodes}
                toggleNode={toggleNode}
                allEmployees={flatList}
              />
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm text-gray-500">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-gradient-to-br from-purple-600 to-purple-700" />
          <span>Leadership</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span>Level 1</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-teal-500" />
          <span>Level 2</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-amber-500" />
          <span>Level 3</span>
        </div>
        <div className="flex items-center gap-2 ml-4 pl-4 border-l border-gray-200">
          <div className="w-6 h-0 border-t-2 border-dashed border-gray-300"></div>
          <span>Reports to</span>
        </div>
      </div>

      {/* Setup hint */}
      {stats.managers === 0 && stats.totalEmployees > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <p className="text-sm text-blue-800">
            <strong>💡 Tip:</strong> To build the org chart hierarchy, edit each employee and set their manager.
            Go to <a href="/employees" className="underline font-medium">Employees</a> → Edit → Select Manager.
          </p>
        </div>
      )}
    </div>
  );
}
