import { useEffect, useMemo, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api, { API_URL } from "../api";
import { ObserveAI } from "../sdk/metrics";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import {
  LayoutDashboard, Database, Server,
  FileText, AlertTriangle, BrainCircuit, Settings, Search,
  Copy, LogOut, Activity, Zap, BarChart3, Cpu, Globe, Bell,
  ShieldAlert, RefreshCw, Plus, ChevronDown, ChevronRight,
  Box, TrendingUp, Clock, Shield, Users, BookOpen, FlaskConical,
  Plug, Crown, Menu, Moon, CheckCircle, XCircle, AlertCircle, Layers
} from "lucide-react";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { io } from "socket.io-client";
import AlertsPanel from "../components/AlertsPanel";
import RootCauseCard from "../components/RootCauseCard";

const BG="rgb(8,8,9)",CARD="#0d0d0f",SIDE="#0a0a0b",BORDER="rgba(255,255,255,0.06)",BSUB="rgba(255,255,255,0.05)",MUTED="#475569",DIM="#64748b",SL3="#94a3b8",SL4="#cbd5e1",WHITE="#ffffff";
const TTC={backgroundColor:CARD,border:"1px solid rgba(255,255,255,0.09)",borderRadius:10,color:WHITE,fontSize:12};
const TREND_COLORS=["#a855f7","#ef4444","#22d3ee","#f59e0b","#22c55e","#0ea5e9"];

const MOCK={
  mongo:{status:"Connected",database:"observeai_db",collectionsCount:12,mongodbVersion:"7.0.5"},
  redis:{status:"Connected"},
  system:{cpuCores:8,cpuUsage:"34%",usedMemory:"6.2 GB",totalMemory:"16 GB",platform:"linux"},
  alerts:[
    {message:"High error rate in payment API",type:"critical",service:"Payment Service"},
    {message:"Database connection timeout",type:"warning",service:"Auth Service"},
    {message:"Slow response time detected",type:"warning",service:"Order Service"},
    {message:"Spike in 500 errors",type:"warning",service:"Inventory Service"},
    {message:"Auth token expiry imminent",type:"info",service:"Auth Service"},
  ],
  alertHistory:[
    {_id:"1",severity:"critical",message:"High error rate in payment API",service:"Payment Service",createdAt:"2024-05-26T15:12:00Z"},
    {_id:"2",severity:"warning",message:"Database connection timeout",service:"Auth Service",createdAt:"2024-05-26T14:48:00Z"},
    {_id:"3",severity:"warning",message:"Slow response time detected",service:"Order Service",createdAt:"2024-05-26T14:15:00Z"},
    {_id:"4",severity:"info",message:"Deployment completed",service:"Payment Service",createdAt:"2024-05-26T13:00:00Z"},
    {_id:"5",severity:"critical",message:"Memory usage above 90%",service:"ML Service",createdAt:"2024-05-26T12:30:00Z"},
  ],
  predictions:[{service:"Payment Service",risk:"high",probability:78,eta:"15-25 min",message:"Anomaly detected",cpu:"2.4",memory:"6.8",zScoreCpu:"1.8",trendScore:"0.6",isAnomaly:true}],
  logs:[
    {message:"POST /api/payment 500 Internal Server Error",type:"error"},
    {message:"GET /api/auth 200 OK",type:"info"},
    {message:"Database query timeout after 5000ms",type:"warning"},
    {message:"Redis cache miss for key user:1234",type:"info"},
    {message:"POST /api/orders 503 Service Unavailable",type:"error"},
  ],
  failures:[
    {endpoint:"/api/payment",status:500,service:"Payment Service",count:14},
    {endpoint:"/api/orders",status:503,service:"Order Service",count:3},
  ],
  profile:{name:"Aman Singh",email:"aman@observeai.dev",role:"Admin"},
  analytics:[],trends:[],rootCauses:[],aggregation:[],deepAnalysis:{services:[],insight:""},
};

const TREND_FB=[
  ...["15:00","15:10","15:20","15:30","15:40","15:50","16:00"].map((t,i)=>({time:t,service:"Payment Service",errorRate:[1.2,2.1,3.21,2.8,4.1,3.9,4.35][i]})),
  ...["15:00","15:10","15:20","15:30","15:40","15:50","16:00"].map((t,i)=>({time:t,service:"Auth Service",errorRate:[0.8,1.2,3.21,2.1,2.9,3.1,3.21][i]})),
  ...["15:00","15:10","15:20","15:30","15:40","15:50","16:00"].map((t,i)=>({time:t,service:"Order Service",errorRate:[0.5,0.9,1.5,1.8,2.0,2.1,2.15][i]})),
];
const REQVOL=["15:00","15:05","15:10","15:15","15:20","15:25","15:30","15:35","15:40","15:45","15:50","15:55","16:00"].map((t,i)=>({time:t,requests:[5200,5800,6100,5900,6420,7200,7800,8100,7600,8300,8900,9200,8700][i]}));
const LATDATA=["15:00","15:05","15:10","15:15","15:20","15:25","15:30","15:35","15:40","15:45","15:50","15:55","16:00"].map((t,i)=>({time:t,latency:[180,195,210,200,243,290,320,380,360,400,390,420,435][i]}));
const LATDIST=[{range:"0-50",count:12000},{range:"50-100",count:28000},{range:"100-200",count:38000},{range:"200-300",count:22000},{range:"300-400",count:8000},{range:"400-500",count:2000},{range:"500+",count:500}];
const SHEALTH=[{name:"Healthy",value:5,color:"#22c55e"},{name:"Warning",value:2,color:"#f59e0b"},{name:"Critical",value:1,color:"#ef4444"}];
const TOPSVC=[{service:"Payment Service",rate:4.35,pct:87},{service:"Auth Service",rate:3.21,pct:64},{service:"Order Service",rate:2.15,pct:43},{service:"Inventory Service",rate:1.25,pct:25},{service:"Notification Service",rate:0.65,pct:13}];

const SERVICES_LIST=[
  {name:"Payment Service",status:"critical",health:32,latency:450,requests:12400,errors:14,endpoint:"/api/payment",uptime:"94.2%",version:"v2.1.0"},
  {name:"Auth Service",status:"warning",health:68,latency:220,requests:34200,errors:8,endpoint:"/api/auth",uptime:"98.1%",version:"v1.8.3"},
  {name:"Order Service",status:"warning",health:71,latency:310,requests:8900,errors:5,endpoint:"/api/orders",uptime:"97.5%",version:"v3.0.1"},
  {name:"Inventory Service",status:"healthy",health:95,latency:90,requests:6200,errors:1,endpoint:"/api/inventory",uptime:"99.9%",version:"v1.5.2"},
  {name:"Notification Service",status:"healthy",health:98,latency:45,requests:18700,errors:0,endpoint:"/api/notify",uptime:"99.9%",version:"v2.3.0"},
  {name:"ML Inference",status:"healthy",health:88,latency:180,requests:3200,errors:2,endpoint:"/api/ml/predict",uptime:"99.1%",version:"v4.0.0"},
  {name:"Analytics Service",status:"healthy",health:92,latency:120,requests:5600,errors:1,endpoint:"/api/analytics",uptime:"99.5%",version:"v1.2.1"},
  {name:"Report Service",status:"healthy",health:96,latency:800,requests:450,errors:0,endpoint:"/api/report",uptime:"99.8%",version:"v1.0.5"},
];
const ENDPOINTS_LIST=[
  {path:"/api/payment",method:"POST",status:500,latency:450,rpm:124,errorRate:11.3,service:"Payment Service",auth:true},
  {path:"/api/auth/login",method:"POST",status:200,latency:220,rpm:342,errorRate:0.8,service:"Auth Service",auth:false},
  {path:"/api/auth/register",method:"POST",status:200,latency:180,rpm:89,errorRate:0.2,service:"Auth Service",auth:false},
  {path:"/api/orders",method:"GET",status:503,latency:310,rpm:89,errorRate:5.6,service:"Order Service",auth:true},
  {path:"/api/orders/:id",method:"PUT",status:200,latency:290,rpm:45,errorRate:1.2,service:"Order Service",auth:true},
  {path:"/api/inventory",method:"GET",status:200,latency:90,rpm:62,errorRate:0.1,service:"Inventory Service",auth:true},
  {path:"/api/notify/send",method:"POST",status:200,latency:45,rpm:187,errorRate:0.0,service:"Notification Svc",auth:true},
  {path:"/api/ml/predict",method:"POST",status:200,latency:180,rpm:32,errorRate:0.6,service:"ML Inference",auth:true},
  {path:"/api/analytics",method:"GET",status:200,latency:120,rpm:56,errorRate:0.2,service:"Analytics Svc",auth:true},
  {path:"/api/report",method:"GET",status:200,latency:800,rpm:5,errorRate:0.0,service:"Report Svc",auth:true},
];
const TEAM_MEMBERS=[
  {name:"Aman Singh",role:"Admin",email:"aman@observeai.dev",avatar:"A",status:"online",joined:"Jan 2024"},
  {name:"Priya Sharma",role:"Developer",email:"priya@observeai.dev",avatar:"P",status:"online",joined:"Feb 2024"},
  {name:"Rohit Kumar",role:"DevOps",email:"rohit@observeai.dev",avatar:"R",status:"away",joined:"Mar 2024"},
  {name:"Sneha Patel",role:"Analyst",email:"sneha@observeai.dev",avatar:"S",status:"offline",joined:"Apr 2024"},
  {name:"Arjun Mehta",role:"Developer",email:"arjun@observeai.dev",avatar:"A",status:"online",joined:"May 2024"},
];
const INTEGRATIONS=[
  {name:"MongoDB",desc:"Primary database",status:"connected",icon:"🍃"},
  {name:"Redis",desc:"Cache & pub/sub",status:"connected",icon:"🔴"},
  {name:"Slack",desc:"Alert notifications",status:"disconnected",icon:"💬"},
  {name:"PagerDuty",desc:"Incident management",status:"disconnected",icon:"📟"},
  {name:"Grafana",desc:"Metrics visualization",status:"connected",icon:"📊"},
  {name:"Prometheus",desc:"Metrics collection",status:"connected",icon:"🔥"},
  {name:"Datadog",desc:"APM & monitoring",status:"disconnected",icon:"🐕"},
  {name:"Webhook",desc:"Custom HTTP callbacks",status:"connected",icon:"🔗"},
];
const INCIDENTS_LIST=[
  {id:"INC-001",title:"High error rate in payment API",service:"Payment Service",severity:"critical",status:"Investigating",started:"May 26, 2024 15:12",duration:"48 min",assignee:"Aman Singh"},
  {id:"INC-002",title:"Database connection timeout",service:"Auth Service",severity:"high",status:"Identified",started:"May 26, 2024 14:48",duration:"72 min",assignee:"Priya Sharma"},
  {id:"INC-003",title:"Slow response time detected",service:"Order Service",severity:"medium",status:"Monitoring",started:"May 26, 2024 14:15",duration:"105 min",assignee:"Rohit Kumar"},
  {id:"INC-004",title:"Spike in 500 errors",service:"Inventory Svc",severity:"high",status:"Resolved",started:"May 26, 2024 13:50",duration:"130 min",assignee:"Sneha Patel"},
  {id:"INC-005",title:"Memory usage above 90%",service:"ML Service",severity:"critical",status:"Resolved",started:"May 26, 2024 12:30",duration:"210 min",assignee:"Arjun Mehta"},
];
const NAV=[
  {Icon:LayoutDashboard,label:"Overview"},
  {Icon:Server,label:"Services"},
  {Icon:Globe,label:"Endpoints"},
  {Icon:BarChart3,label:"Dashboards"},
  {Icon:Bell,label:"Alerts",badge:5},
  {Icon:ShieldAlert,label:"Incidents"},
  {Icon:BrainCircuit,label:"AI Predictions"},
  {Icon:FileText,label:"Reports"},
  {Icon:FlaskConical,label:"Chaos Testing"},
  {Icon:Plug,label:"Integrations"},
  {Icon:Users,label:"Team"},
  {Icon:Settings,label:"Settings"},
];


/* ── HELPERS ── */
function bdg(sev){
  const m={critical:{bg:"rgba(239,68,68,0.15)",c:"#f87171",b:"rgba(239,68,68,0.22)"},high:{bg:"rgba(249,115,22,0.15)",c:"#fb923c",b:"rgba(249,115,22,0.22)"},warning:{bg:"rgba(245,158,11,0.15)",c:"#fbbf24",b:"rgba(245,158,11,0.22)"},medium:{bg:"rgba(234,179,8,0.15)",c:"#facc15",b:"rgba(234,179,8,0.22)"},info:{bg:"rgba(34,197,94,0.15)",c:"#4ade80",b:"rgba(34,197,94,0.22)"},healthy:{bg:"rgba(34,197,94,0.15)",c:"#4ade80",b:"rgba(34,197,94,0.22)"}};
  const d=m[sev]||m.info;
  return{background:d.bg,color:d.c,border:`1px solid ${d.b}`,borderRadius:999,padding:"3px 10px",fontSize:11,fontWeight:700,textTransform:"uppercase",display:"inline-block"};
}
const statusCol={Investigating:"#f87171",Identified:"#fbbf24",Monitoring:"#facc15",Resolved:"#4ade80"};
const statusDot={online:"#22c55e",away:"#f59e0b",offline:"#475569"};
const methodColor={GET:"#22d3ee",POST:"#a855f7",PUT:"#f59e0b",DELETE:"#f87171",PATCH:"#4ade80"};

function IBox({children,col}){
  const m={violet:{bg:"rgba(139,92,246,0.12)",b:"rgba(139,92,246,0.18)",c:"#a78bfa"},cyan:{bg:"rgba(34,211,238,0.12)",b:"rgba(34,211,238,0.18)",c:"#22d3ee"},red:{bg:"rgba(239,68,68,0.12)",b:"rgba(239,68,68,0.18)",c:"#f87171"},amber:{bg:"rgba(245,158,11,0.12)",b:"rgba(245,158,11,0.18)",c:"#fbbf24"},orange:{bg:"rgba(249,115,22,0.12)",b:"rgba(249,115,22,0.18)",c:"#fb923c"},green:{bg:"rgba(34,197,94,0.12)",b:"rgba(34,197,94,0.18)",c:"#4ade80"}};
  const s=m[col]||m.violet;
  return<div style={{background:s.bg,border:`1px solid ${s.b}`,borderRadius:10,padding:10,color:s.c,flexShrink:0,display:"flex",alignItems:"center",justifyContent:"center"}}>{children}</div>;
}
function Crd({children,style={},glow}){
  const g={red:"rgba(239,68,68,0.1)",green:"rgba(34,197,94,0.08)",cyan:"rgba(34,211,238,0.08)",violet:"rgba(139,92,246,0.08)"};
  return<div style={{background:CARD,border:`1px solid ${glow?g[glow]:BORDER}`,borderRadius:16,padding:20,position:"relative",overflow:"hidden",...style}}>{children}</div>;
}
function SCrd({title,value,delta,up,iconEl}){
  return(
    <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:"18px 20px"}}>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
        <div>
          <p style={{fontSize:12,color:MUTED,fontWeight:500,marginBottom:6}}>{title}</p>
          <h3 style={{fontSize:28,fontWeight:900,color:WHITE,lineHeight:1,letterSpacing:"-0.5px"}}>{value}</h3>
          {delta&&<p style={{fontSize:12,fontWeight:600,marginTop:6,color:up?"#34d399":"#f87171",display:"flex",alignItems:"center",gap:4}}>
            <span>{up?"▲":"▼"} {delta}</span>
            <span style={{color:DIM,fontWeight:400}}>vs last 24h</span>
          </p>}
        </div>
        {iconEl}
      </div>
    </div>
  );
}
function GBtn({children,onClick,style={}}){
  return(
    <button onClick={onClick} style={{display:"flex",alignItems:"center",gap:6,background:"rgba(255,255,255,0.04)",border:`1px solid ${BORDER}`,borderRadius:10,padding:"7px 14px",color:WHITE,fontSize:13,cursor:"pointer",...style}}
      onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.07)"}
      onMouseLeave={e=>e.currentTarget.style.background="rgba(255,255,255,0.04)"}>
      {children}
    </button>
  );
}
function SHdr({title,subtitle,action}){
  return(
    <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
      <div>
        <h1 style={{fontSize:22,fontWeight:900,color:WHITE,letterSpacing:"-0.4px"}}>{title}</h1>
        {subtitle&&<p style={{fontSize:13,color:MUTED,marginTop:4}}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
function MiniKPI({items}){
  return(
    <div style={{display:"grid",gridTemplateColumns:`repeat(${items.length},1fr)`,gap:12,marginBottom:16}}>
      {items.map((c,i)=>(
        <div key={i} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:"16px 18px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div><p style={{fontSize:11,color:MUTED,marginBottom:4}}>{c.label}</p><p style={{fontSize:c.small?18:26,fontWeight:900,color:WHITE}}>{c.val}</p></div>
          {c.icon&&<IBox col={c.col}>{c.icon}</IBox>}
        </div>
      ))}
    </div>
  );
}


/* ══ SECTION COMPONENTS ══ */

function ServicesSection({searchTerm=""}){
  const [filter,setFilter]=useState("all");
  const list=SERVICES_LIST.filter(s=>{
    const matchFilter=filter==="all"||s.status===filter;
    const matchSearch=!searchTerm||s.name.toLowerCase().includes(searchTerm.toLowerCase())||s.endpoint.toLowerCase().includes(searchTerm.toLowerCase());
    return matchFilter&&matchSearch;
  });
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SHdr title="Services" subtitle="Monitor all registered services in real-time"
        action={<div style={{display:"flex",gap:8}}>{["all","healthy","warning","critical"].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:"6px 14px",borderRadius:8,border:`1px solid ${filter===f?"#7c3aed":BORDER}`,background:filter===f?"rgba(124,58,237,0.2)":"transparent",color:filter===f?WHITE:MUTED,fontSize:12,fontWeight:600,cursor:"pointer",textTransform:"capitalize"}}>{f}</button>
        ))}</div>}/>
      <MiniKPI items={[
        {label:"Total",val:SERVICES_LIST.length,col:"violet",icon:<Layers size={16}/>},
        {label:"Healthy",val:SERVICES_LIST.filter(s=>s.status==="healthy").length,col:"green",icon:<CheckCircle size={16}/>},
        {label:"Warning",val:SERVICES_LIST.filter(s=>s.status==="warning").length,col:"amber",icon:<AlertCircle size={16}/>},
        {label:"Critical",val:SERVICES_LIST.filter(s=>s.status==="critical").length,col:"red",icon:<XCircle size={16}/>},
      ]}/>
      <Crd>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:`1px solid ${BORDER}`}}>
            {["Service","Status","Health","Latency","Requests","Errors","Uptime","Version"].map(h=>(
              <th key={h} style={{textAlign:"left",fontSize:11,color:MUTED,fontWeight:500,paddingBottom:12,paddingRight:14}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{list.map((s,i)=>(
            <tr key={i} style={{borderBottom:`1px solid rgba(255,255,255,0.04)`,cursor:"pointer"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <td style={{padding:"13px 14px 13px 0"}}>
                <div style={{fontSize:13,fontWeight:600,color:WHITE}}>{s.name}</div>
                <div style={{fontSize:11,color:MUTED,marginTop:2,fontFamily:"monospace"}}>{s.endpoint}</div>
              </td>
              <td style={{padding:"13px 14px 13px 0"}}><span style={bdg(s.status)}>{s.status}</span></td>
              <td style={{padding:"13px 14px 13px 0"}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{flex:1,height:5,borderRadius:99,background:"rgba(255,255,255,0.07)",minWidth:50}}>
                    <div style={{width:`${s.health}%`,height:"100%",borderRadius:99,background:s.health>80?"#22c55e":s.health>60?"#f59e0b":"#ef4444"}}/>
                  </div>
                  <span style={{fontSize:11,color:SL3}}>{s.health}%</span>
                </div>
              </td>
              <td style={{padding:"13px 14px 13px 0",fontSize:13,color:s.latency>300?"#f87171":s.latency>150?"#fbbf24":"#4ade80",fontWeight:600}}>{s.latency}ms</td>
              <td style={{padding:"13px 14px 13px 0",fontSize:13,color:SL3}}>{s.requests.toLocaleString()}</td>
              <td style={{padding:"13px 14px 13px 0",fontSize:13,color:s.errors>5?"#f87171":"#fbbf24",fontWeight:600}}>{s.errors}</td>
              <td style={{padding:"13px 14px 13px 0",fontSize:13,color:SL3}}>{s.uptime}</td>
              <td style={{padding:"13px 0 13px 0",fontSize:12,color:MUTED,fontFamily:"monospace"}}>{s.version}</td>
            </tr>
          ))}</tbody>
        </table>
      </Crd>
    </div>
  );
}

function EndpointsSection({searchTerm:globalSearch=""}){
  const [localSearch,setLocalSearch]=useState("");
  const search=localSearch||globalSearch;
  const list=ENDPOINTS_LIST.filter(e=>e.path.toLowerCase().includes(search.toLowerCase())||e.service.toLowerCase().includes(search.toLowerCase()));
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SHdr title="Endpoints" subtitle="All API endpoints and real-time performance"
        action={<div style={{display:"flex",alignItems:"center",gap:9,background:"rgba(255,255,255,0.04)",border:`1px solid ${BORDER}`,borderRadius:10,padding:"7px 14px",width:240}}>
          <Search size={13} color={MUTED}/>
          <input type="text" placeholder="Search endpoints..." value={localSearch} onChange={e=>setLocalSearch(e.target.value)} style={{background:"transparent",border:"none",outline:"none",fontSize:13,color:WHITE,width:"100%"}}/>
        </div>}/>
      <MiniKPI items={[
        {label:"Total Endpoints",val:ENDPOINTS_LIST.length,col:"violet"},
        {label:"Healthy (2xx)",val:ENDPOINTS_LIST.filter(e=>e.status<300).length,col:"green"},
        {label:"Errors (4xx/5xx)",val:ENDPOINTS_LIST.filter(e=>e.status>=400).length,col:"red"},
        {label:"Avg Latency",val:`${Math.round(ENDPOINTS_LIST.reduce((s,e)=>s+e.latency,0)/ENDPOINTS_LIST.length)}ms`,col:"amber",small:true},
      ]}/>
      <Crd>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:`1px solid ${BORDER}`}}>
            {["Method","Endpoint","Service","Status","Latency","RPM","Error Rate","Auth"].map(h=>(
              <th key={h} style={{textAlign:"left",fontSize:11,color:MUTED,fontWeight:500,paddingBottom:12,paddingRight:12}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{list.map((e,i)=>(
            <tr key={i} style={{borderBottom:`1px solid rgba(255,255,255,0.04)`,cursor:"pointer"}}
              onMouseEnter={ev=>ev.currentTarget.style.background="rgba(255,255,255,0.02)"}
              onMouseLeave={ev=>ev.currentTarget.style.background="transparent"}>
              <td style={{padding:"12px 12px 12px 0"}}>
                <span style={{background:`${methodColor[e.method]||"#888"}20`,color:methodColor[e.method]||"#888",border:`1px solid ${methodColor[e.method]||"#888"}40`,borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700,fontFamily:"monospace"}}>{e.method}</span>
              </td>
              <td style={{padding:"12px 12px 12px 0",fontSize:12,color:WHITE,fontFamily:"monospace"}}>{e.path}</td>
              <td style={{padding:"12px 12px 12px 0",fontSize:12,color:MUTED}}>{e.service}</td>
              <td style={{padding:"12px 12px 12px 0",fontSize:13,fontWeight:700,color:e.status>=500?"#f87171":e.status>=400?"#fbbf24":"#4ade80"}}>{e.status}</td>
              <td style={{padding:"12px 12px 12px 0",fontSize:13,color:e.latency>400?"#f87171":e.latency>200?"#fbbf24":"#4ade80",fontWeight:600}}>{e.latency}ms</td>
              <td style={{padding:"12px 12px 12px 0",fontSize:13,color:SL3}}>{e.rpm}/min</td>
              <td style={{padding:"12px 12px 12px 0",fontSize:13,color:e.errorRate>5?"#f87171":e.errorRate>1?"#fbbf24":"#4ade80",fontWeight:600}}>{e.errorRate}%</td>
              <td style={{padding:"12px 0 12px 0",fontSize:11,color:e.auth?"#a78bfa":"#475569"}}>{e.auth?"🔒 Required":"🔓 Public"}</td>
            </tr>
          ))}</tbody>
        </table>
      </Crd>
    </div>
  );
}

function DashboardsSection({historyData,trendChartData,trendServices,analytics}){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SHdr title="Dashboards" subtitle="Custom analytics and performance insights"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Crd>
          <h3 style={{fontSize:14,fontWeight:700,color:WHITE,marginBottom:14}}>CPU & Memory Trend (Live)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={historyData} margin={{top:4,right:4,left:-28,bottom:0}}>
              <defs>
                <linearGradient id="cpuG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/><stop offset="95%" stopColor="#a855f7" stopOpacity={0}/></linearGradient>
                <linearGradient id="memG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/><stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="time" tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={TTC}/>
              <Area type="monotone" dataKey="cpu" stroke="#a855f7" fill="url(#cpuG)" strokeWidth={2} dot={false} name="CPU %"/>
              <Area type="monotone" dataKey="memory" stroke="#22d3ee" fill="url(#memG)" strokeWidth={2} dot={false} name="Memory %"/>
            </AreaChart>
          </ResponsiveContainer>
        </Crd>
        <Crd>
          <h3 style={{fontSize:14,fontWeight:700,color:WHITE,marginBottom:14}}>Service Error Rates</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={trendChartData} margin={{top:4,right:4,left:-28,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="time" tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,6]} tickFormatter={v=>`${v}%`} tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={TTC} formatter={v=>[`${Number(v).toFixed(2)}%`,"Error Rate"]}/>
              {trendServices.map((s,i)=><Line key={s} type="monotone" dataKey={s} stroke={TREND_COLORS[i%TREND_COLORS.length]} strokeWidth={2.5} dot={false} connectNulls/>)}
            </LineChart>
          </ResponsiveContainer>
        </Crd>
        <Crd>
          <h3 style={{fontSize:14,fontWeight:700,color:WHITE,marginBottom:14}}>Latency Distribution</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={LATDIST} margin={{top:4,right:4,left:-28,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="range" tick={{fill:MUTED,fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
              <Tooltip contentStyle={TTC} cursor={{fill:"rgba(255,255,255,0.03)"}}/>
              <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Crd>
        <Crd>
          <h3 style={{fontSize:14,fontWeight:700,color:WHITE,marginBottom:14}}>Request Volume Trend</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={REQVOL} margin={{top:4,right:4,left:-28,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="time" tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
              <Tooltip contentStyle={TTC} formatter={v=>[`${(v/1000).toFixed(2)}K`,"Requests"]}/>
              <Line type="monotone" dataKey="requests" stroke="#a855f7" strokeWidth={2.5} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </Crd>
      </div>
    </div>
  );
}


function AlertsSection({alerts,alertHistory,searchTerm=""}){
  const filtAlerts=searchTerm?alerts.filter(a=>a.message?.toLowerCase().includes(searchTerm.toLowerCase())||a.service?.toLowerCase().includes(searchTerm.toLowerCase())):alerts;
  const filtHistory=searchTerm?alertHistory.filter(a=>a.message?.toLowerCase().includes(searchTerm.toLowerCase())||a.service?.toLowerCase().includes(searchTerm.toLowerCase())):alertHistory;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SHdr title="Alerts" subtitle="Real-time system alerts and notification history"/>
      <MiniKPI items={[
        {label:"Critical",val:filtAlerts.filter(a=>a.type==="critical").length,col:"red",icon:<XCircle size={16}/>},
        {label:"Warning",val:filtAlerts.filter(a=>a.type==="warning").length,col:"amber",icon:<AlertCircle size={16}/>},
        {label:"Info",val:filtAlerts.filter(a=>a.type==="info").length,col:"green",icon:<CheckCircle size={16}/>},
        {label:"Total Active",val:filtAlerts.length,col:"violet",icon:<Bell size={16}/>},
      ]}/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Crd glow="red">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <h3 style={{fontSize:14,fontWeight:700,color:WHITE}}>Active Alerts</h3>
            <Bell size={16} color="#f87171"/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {filtAlerts.map((a,i)=>(
              <div key={i} style={{padding:"11px 14px",borderRadius:12,...(a.type==="critical"?{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.17)"}:a.type==="warning"?{background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.17)"}:{background:"rgba(34,197,94,0.07)",border:"1px solid rgba(34,197,94,0.17)"})}}>
                <p style={{fontSize:13,fontWeight:600,color:WHITE}}>{a.message}</p>
                <p style={{fontSize:10,color:MUTED,marginTop:4,textTransform:"uppercase",letterSpacing:"0.09em"}}>{a.type} · {a.service}</p>
              </div>
            ))}
          </div>
        </Crd>
        <Crd>
          <div style={{marginBottom:14}}>
            <p style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(249,115,22,0.7)",marginBottom:3}}>Timeline</p>
            <h3 style={{fontSize:14,fontWeight:700,color:WHITE}}>Alert History</h3>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {filtHistory.map(a=>(
              <div key={a._id} style={{padding:"11px 14px",borderRadius:12,border:`1px solid ${BORDER}`,background:"rgba(255,255,255,0.02)"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10}}>
                  <div style={{flex:1}}>
                    <span style={bdg(a.severity)}>{a.severity}</span>
                    <p style={{fontSize:13,fontWeight:600,color:WHITE,marginTop:7}}>{a.message}</p>
                    <p style={{fontSize:11,color:MUTED,marginTop:3}}>{a.service}</p>
                  </div>
                  <p style={{fontSize:11,color:DIM,whiteSpace:"nowrap"}}>{new Date(a.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Crd>
      </div>
    </div>
  );
}

function IncidentsSection({failures,searchTerm=""}){
  const filtInc=searchTerm?INCIDENTS_LIST.filter(i=>i.title.toLowerCase().includes(searchTerm.toLowerCase())||i.service.toLowerCase().includes(searchTerm.toLowerCase())||i.assignee.toLowerCase().includes(searchTerm.toLowerCase())):INCIDENTS_LIST;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SHdr title="Incidents" subtitle="Track, manage and resolve system incidents"/>
      <MiniKPI items={[
        {label:"Open",val:INCIDENTS_LIST.filter(i=>i.status!=="Resolved").length,col:"red"},
        {label:"Resolved",val:INCIDENTS_LIST.filter(i=>i.status==="Resolved").length,col:"green"},
        {label:"Critical",val:INCIDENTS_LIST.filter(i=>i.severity==="critical").length,col:"orange"},
        {label:"MTTR",val:"48 min",col:"violet",small:true},
      ]}/>
      <Crd>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:`1px solid ${BORDER}`}}>
            {["ID","Title","Service","Severity","Status","Duration","Assignee"].map(h=>(
              <th key={h} style={{textAlign:"left",fontSize:11,color:MUTED,fontWeight:500,paddingBottom:12,paddingRight:14}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtInc.map((inc,i)=>(
            <tr key={i} style={{borderBottom:`1px solid rgba(255,255,255,0.04)`,cursor:"pointer"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.02)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
              <td style={{padding:"12px 14px 12px 0",fontSize:11,color:MUTED,fontFamily:"monospace"}}>{inc.id}</td>
              <td style={{padding:"12px 14px 12px 0",fontSize:13,color:WHITE}}>{inc.title}</td>
              <td style={{padding:"12px 14px 12px 0",fontSize:12,color:MUTED}}>{inc.service}</td>
              <td style={{padding:"12px 14px 12px 0"}}><span style={bdg(inc.severity)}>{inc.severity}</span></td>
              <td style={{padding:"12px 14px 12px 0",fontSize:13,fontWeight:600,color:statusCol[inc.status]||SL3}}>{inc.status}</td>
              <td style={{padding:"12px 14px 12px 0",fontSize:12,color:MUTED}}>{inc.duration}</td>
              <td style={{padding:"12px 0 12px 0",fontSize:12,color:SL3}}>{inc.assignee}</td>
            </tr>
          ))}</tbody>
        </table>
      </Crd>
      {failures.length>0&&(
        <Crd glow="red">
          <h3 style={{fontSize:14,fontWeight:700,color:WHITE,marginBottom:14}}>Live Failure Detection</h3>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {failures.map((f,i)=>(
              <div key={i} style={{padding:"11px 14px",borderRadius:12,background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.17)"}}>
                <p style={{fontSize:13,fontWeight:600,color:WHITE}}>{f.endpoint} — HTTP {f.status}</p>
                <p style={{fontSize:10,color:MUTED,marginTop:4,textTransform:"uppercase"}}>{f.service} · count: {f.count}</p>
              </div>
            ))}
          </div>
        </Crd>
      )}
    </div>
  );
}

function AIPredictionsSection({predictions,rootCauses,deepAnalysis}){
  const pred=predictions[0]||{};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SHdr title="AI Predictions" subtitle="ML-powered failure prediction and root cause analysis"/>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:14}}>
        <Crd glow="red" style={{position:"relative"}}>
          <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at top right,rgba(239,68,68,0.09),transparent 60%)",borderRadius:16,pointerEvents:"none"}}/>
          <div style={{position:"relative"}}>
            <p style={{fontSize:11,color:"rgba(239,68,68,0.7)",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:8}}>Failure Risk</p>
            <div style={{fontSize:48,fontWeight:900,color:WHITE,lineHeight:1}}>{pred.probability||78}%</div>
            <div style={{fontSize:11,color:MUTED,marginTop:4}}>Failure Probability</div>
            <span style={{...bdg(pred.risk==="high"?"critical":"warning"),marginTop:10,display:"inline-block"}}>{pred.risk||"high"} risk</span>
            <p style={{fontSize:13,color:SL3,marginTop:10}}>{pred.message||"Anomaly detected in system metrics"}</p>
            <div style={{marginTop:12,height:4,borderRadius:99,background:"rgba(255,255,255,0.07)"}}>
              <div style={{width:`${pred.probability||78}%`,height:"100%",borderRadius:99,background:"linear-gradient(90deg,#ef4444,#f97316,#fbbf24)",boxShadow:"0 0 12px rgba(239,68,68,0.4)"}}/>
            </div>
          </div>
        </Crd>
        <Crd>
          <p style={{fontSize:11,color:MUTED,textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:14}}>System Metrics</p>
          {[
            {label:"CPU Load",val:`${pred.cpu||"2.4"}`,unit:"avg",color:"#a855f7"},
            {label:"Memory Used",val:`${pred.memory||"6.8"}`,unit:"GB",color:"#22d3ee"},
            {label:"Z-Score CPU",val:`${pred.zScoreCpu||"1.8"}`,unit:"σ",color:"#f59e0b"},
            {label:"Trend Score",val:`${pred.trendScore||"0.6"}`,unit:"",color:"#4ade80"},
            {label:"Anomaly",val:pred.isAnomaly?"YES":"NO",unit:"",color:pred.isAnomaly?"#f87171":"#4ade80"},
          ].map((m,i)=>(
            <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <span style={{fontSize:13,color:MUTED}}>{m.label}</span>
              <span style={{fontSize:14,fontWeight:700,color:m.color}}>{m.val} <span style={{fontSize:11,fontWeight:400,color:MUTED}}>{m.unit}</span></span>
            </div>
          ))}
        </Crd>
        <Crd glow="violet">
          <p style={{fontSize:11,color:"rgba(139,92,246,0.7)",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:14}}>Deep Analysis</p>
          {deepAnalysis?.insight&&(
            <div style={{padding:"10px 12px",borderRadius:10,background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.2)",marginBottom:14}}>
              <p style={{fontSize:12,color:"#c4b5fd"}}>{deepAnalysis.insight}</p>
            </div>
          )}
          {deepAnalysis?.services?.length>0?deepAnalysis.services.slice(0,4).map((s,i)=>(
            <div key={i} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                <span style={{fontSize:12,color:SL3}}>{s.service}</span>
                <span style={bdg(s.status)}>{s.status}</span>
              </div>
              <div style={{height:4,borderRadius:99,background:"rgba(255,255,255,0.07)"}}>
                <div style={{width:`${Math.min(parseFloat(s.score)/3,100)}%`,height:"100%",borderRadius:99,background:"#7c3aed"}}/>
              </div>
            </div>
          )):<p style={{fontSize:13,color:MUTED}}>Analysis available once services send metrics via SDK.</p>}
        </Crd>
      </div>
      {rootCauses.length>0&&(
        <Crd glow="violet">
          <p style={{fontSize:11,color:"rgba(139,92,246,0.7)",textTransform:"uppercase",letterSpacing:"0.15em",marginBottom:14}}>Root Cause Analysis</p>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
            {rootCauses.map((rc,i)=>(
              <div key={i} style={{padding:"14px 16px",borderRadius:12,border:"1px solid rgba(139,92,246,0.2)",background:"rgba(139,92,246,0.06)"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontSize:13,fontWeight:700,color:WHITE}}>{rc.service}</span>
                  <span style={bdg(rc.severity)}>{rc.severity}</span>
                </div>
                <p style={{fontSize:13,color:"#c4b5fd",fontWeight:600}}>{rc.reason}</p>
                <p style={{fontSize:12,color:MUTED,marginTop:4}}>{rc.detail}</p>
                <div style={{marginTop:10,display:"flex",gap:10,flexWrap:"wrap"}}>
                  {[["Err",`${rc.errorRate}%`],["Lat",`${rc.avgLatency}ms`],["Score",rc.score]].map(([k,v])=>(
                    <div key={k} style={{fontSize:11,color:MUTED}}>{k}: <span style={{color:SL3,fontWeight:600}}>{v}</span></div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Crd>
      )}
      <Crd>
        <h3 style={{fontSize:14,fontWeight:700,color:WHITE,marginBottom:14}}>Risk Score Over Time</h3>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={[{t:"15:00",v:20},{t:"15:10",v:28},{t:"15:20",v:35},{t:"15:30",v:50},{t:"15:40",v:62},{t:"15:50",v:71},{t:"16:00",v:pred.probability||78}]} margin={{top:4,right:4,left:-28,bottom:0}}>
            <defs><linearGradient id="riskG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/><stop offset="95%" stopColor="#ef4444" stopOpacity={0}/></linearGradient></defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
            <XAxis dataKey="t" tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={TTC}/>
            <Area type="monotone" dataKey="v" stroke="#ef4444" fill="url(#riskG)" strokeWidth={2.5} dot={false} name="Risk %"/>
          </AreaChart>
        </ResponsiveContainer>
      </Crd>
    </div>
  );
}


function ReportsSection(){
  const RPTS=[
    {name:"System Health Report",date:"May 26, 2024 16:00",type:"PDF",size:"2.4 MB"},
    {name:"Error Analysis Report",date:"May 26, 2024 14:00",type:"PDF",size:"1.8 MB"},
    {name:"Performance Benchmark",date:"May 25, 2024 09:00",type:"CSV",size:"456 KB"},
    {name:"API Usage Statistics",date:"May 24, 2024 18:00",type:"JSON",size:"890 KB"},
    {name:"Weekly Summary",date:"May 20, 2024 08:00",type:"PDF",size:"3.1 MB"},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SHdr title="Reports" subtitle="Download system reports and analytics exports"
        action={<button onClick={()=>window.open(`${API_URL}/api/pdf-report`,"_blank")} style={{display:"flex",alignItems:"center",gap:7,background:"#4f46e5",border:"none",borderRadius:11,padding:"9px 18px",color:WHITE,fontSize:13,fontWeight:600,cursor:"pointer"}}>
          <FileText size={14}/> Generate Report
        </button>}/>
      <MiniKPI items={[{label:"Total Reports",val:"47",col:"violet"},{label:"Downloads",val:"128",col:"cyan"},{label:"Last Generated",val:"5 min ago",col:"amber",small:true}]}/>
      <Crd>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:`1px solid ${BORDER}`}}>
            {["Report Name","Generated","Type","Size","Action"].map(h=>(
              <th key={h} style={{textAlign:"left",fontSize:11,color:MUTED,fontWeight:500,paddingBottom:12,paddingRight:16}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{RPTS.map((r,i)=>(
            <tr key={i} style={{borderBottom:`1px solid rgba(255,255,255,0.04)`}}>
              <td style={{padding:"13px 16px 13px 0",fontSize:13,color:WHITE}}>{r.name}</td>
              <td style={{padding:"13px 16px 13px 0",fontSize:12,color:MUTED}}>{r.date}</td>
              <td style={{padding:"13px 16px 13px 0"}}><span style={{background:"rgba(139,92,246,0.12)",color:"#a78bfa",borderRadius:6,padding:"2px 8px",fontSize:11,fontWeight:700}}>{r.type}</span></td>
              <td style={{padding:"13px 16px 13px 0",fontSize:12,color:MUTED}}>{r.size}</td>
              <td style={{padding:"13px 0 13px 0"}}>
                <button onClick={()=>window.open(`${API_URL}/api/pdf-report`,"_blank")} style={{fontSize:12,color:"#a78bfa",background:"rgba(139,92,246,0.1)",border:"1px solid rgba(139,92,246,0.2)",borderRadius:7,padding:"4px 12px",cursor:"pointer"}}>Download</button>
              </td>
            </tr>
          ))}</tbody>
        </table>
      </Crd>
    </div>
  );
}

function ChaosSection(){
  const [running,setRunning]=useState(null);
  const TESTS=[
    {id:"cpu-spike",name:"CPU Spike Test",desc:"Simulate 90%+ CPU usage for 30 seconds",risk:"high",duration:"30s",icon:"⚡"},
    {id:"memory-leak",name:"Memory Leak Simulation",desc:"Gradually consume memory over 60 seconds",risk:"high",duration:"60s",icon:"💾"},
    {id:"network-delay",name:"Network Latency Inject",desc:"Add 500ms latency to all API calls",risk:"medium",duration:"45s",icon:"🌐"},
    {id:"db-conn",name:"DB Connection Drop",desc:"Simulate database connection failures",risk:"high",duration:"20s",icon:"🗄"},
    {id:"service-kill",name:"Service Termination",desc:"Kill a random service and observe recovery",risk:"critical",duration:"15s",icon:"💀"},
    {id:"traffic-spike",name:"Traffic Spike",desc:"Simulate 10x normal request volume",risk:"medium",duration:"120s",icon:"📈"},
  ];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SHdr title="Chaos Testing" subtitle="Inject failures to test system resilience"/>
      <div style={{padding:"14px 18px",borderRadius:12,background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.2)",display:"flex",alignItems:"center",gap:12}}>
        <AlertTriangle size={18} color="#fbbf24"/>
        <p style={{fontSize:13,color:"#fbbf24"}}>⚠ Chaos tests inject real failures. Run only in staging/test environments.</p>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
        {TESTS.map((t,i)=>(
          <Crd key={i}>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
              <span style={{fontSize:28}}>{t.icon}</span>
              <span style={bdg(t.risk==="critical"?"critical":t.risk==="high"?"high":"warning")}>{t.risk}</span>
            </div>
            <h3 style={{fontSize:14,fontWeight:700,color:WHITE,marginBottom:6}}>{t.name}</h3>
            <p style={{fontSize:12,color:MUTED,marginBottom:14,lineHeight:1.6}}>{t.desc}</p>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span style={{fontSize:11,color:MUTED}}>⏱ {t.duration}</span>
              <button onClick={()=>{setRunning(t.id);setTimeout(()=>setRunning(null),3000);}}
                style={{background:running===t.id?"rgba(239,68,68,0.2)":"rgba(124,58,237,0.2)",border:`1px solid ${running===t.id?"rgba(239,68,68,0.3)":"rgba(124,58,237,0.3)"}`,borderRadius:8,padding:"6px 14px",color:running===t.id?"#f87171":"#a78bfa",fontSize:12,fontWeight:600,cursor:"pointer"}}>
                {running===t.id?"Running...":"Run Test"}
              </button>
            </div>
          </Crd>
        ))}
      </div>
    </div>
  );
}

function IntegrationsSection(){
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SHdr title="Integrations" subtitle="Connect your tools and services with ObserveAI"/>
      <MiniKPI items={[
        {label:"Connected",val:INTEGRATIONS.filter(i=>i.status==="connected").length,col:"green"},
        {label:"Available",val:INTEGRATIONS.filter(i=>i.status==="disconnected").length,col:"violet"},
        {label:"Total",val:INTEGRATIONS.length,col:"cyan"},
      ]}/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
        {INTEGRATIONS.map((intg,i)=>(
          <Crd key={i}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:44,height:44,borderRadius:12,background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{intg.icon}</div>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:WHITE}}>{intg.name}</div>
                  <div style={{fontSize:12,color:MUTED,marginTop:2}}>{intg.desc}</div>
                </div>
              </div>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{...bdg(intg.status==="connected"?"healthy":"warning"),fontSize:10}}>{intg.status}</span>
                <button style={{background:intg.status==="connected"?"rgba(239,68,68,0.1)":"rgba(124,58,237,0.1)",border:`1px solid ${intg.status==="connected"?"rgba(239,68,68,0.2)":"rgba(124,58,237,0.2)"}`,borderRadius:8,padding:"5px 12px",color:intg.status==="connected"?"#f87171":"#a78bfa",fontSize:11,fontWeight:600,cursor:"pointer"}}>
                  {intg.status==="connected"?"Disconnect":"Connect"}
                </button>
              </div>
            </div>
          </Crd>
        ))}
      </div>
    </div>
  );
}

function TeamSection({profile,searchTerm=""}){
  const filtTeam=searchTerm?TEAM_MEMBERS.filter(m=>m.name.toLowerCase().includes(searchTerm.toLowerCase())||m.role.toLowerCase().includes(searchTerm.toLowerCase())||m.email.toLowerCase().includes(searchTerm.toLowerCase())):TEAM_MEMBERS;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SHdr title="Team" subtitle="Manage team members and access levels"
        action={<button style={{display:"flex",alignItems:"center",gap:7,background:"#7c3aed",border:"none",borderRadius:10,padding:"8px 16px",color:WHITE,fontSize:13,fontWeight:600,cursor:"pointer"}}><Plus size={14}/> Invite Member</button>}/>
      <MiniKPI items={[
        {label:"Total Members",val:filtTeam.length,col:"violet"},
        {label:"Online",val:filtTeam.filter(m=>m.status==="online").length,col:"green"},
        {label:"Admins",val:filtTeam.filter(m=>m.role==="Admin").length,col:"amber"},
      ]}/>
      <Crd>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:`1px solid ${BORDER}`}}>
            {["Member","Role","Status","Email","Joined","Actions"].map(h=>(
              <th key={h} style={{textAlign:"left",fontSize:11,color:MUTED,fontWeight:500,paddingBottom:12,paddingRight:16}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{filtTeam.map((m,i)=>(
            <tr key={i} style={{borderBottom:`1px solid rgba(255,255,255,0.04)`}}>
              <td style={{padding:"13px 16px 13px 0"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <div style={{width:32,height:32,borderRadius:999,background:"linear-gradient(135deg,#7c3aed,#22d3ee)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900}}>{m.avatar}</div>
                  <span style={{fontSize:13,fontWeight:600,color:WHITE}}>{m.name}</span>
                </div>
              </td>
              <td style={{padding:"13px 16px 13px 0",fontSize:12,color:MUTED}}>{m.role}</td>
              <td style={{padding:"13px 16px 13px 0"}}>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{width:7,height:7,borderRadius:999,background:statusDot[m.status]}}/>
                  <span style={{fontSize:12,color:SL3,textTransform:"capitalize"}}>{m.status}</span>
                </div>
              </td>
              <td style={{padding:"13px 16px 13px 0",fontSize:12,color:MUTED}}>{m.email}</td>
              <td style={{padding:"13px 16px 13px 0",fontSize:12,color:MUTED}}>{m.joined}</td>
              <td style={{padding:"13px 0 13px 0"}}>
                {m.name!==profile.name&&<button style={{fontSize:11,color:"#f87171",background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.18)",borderRadius:7,padding:"4px 10px",cursor:"pointer"}}>Remove</button>}
              </td>
            </tr>
          ))}</tbody>
        </table>
      </Crd>
    </div>
  );
}

function SettingsSection({profile,handleLogout}){
  const [name,setName]=useState(profile.name||"");
  const [email,setEmail]=useState(profile.email||"");
  const [notif,setNotif]=useState({email:true,slack:false,webhook:true});
  const [saved,setSaved]=useState(false);
  const save=()=>{setSaved(true);setTimeout(()=>setSaved(false),2500);};
  const inp={width:"100%",background:"#0a0a0c",border:`1px solid ${BORDER}`,borderRadius:10,padding:"11px 14px",color:WHITE,fontSize:14,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
  const Toggle=({on,onChange})=>(
    <div onClick={onChange} style={{width:44,height:24,borderRadius:999,background:on?"#7c3aed":"rgba(255,255,255,0.1)",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
      <div style={{position:"absolute",top:3,left:on?20:3,width:18,height:18,borderRadius:999,background:"white",transition:"left 0.2s"}}/>
    </div>
  );
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16,maxWidth:720}}>
      <SHdr title="Settings" subtitle="Manage your account and system preferences"/>
      <Crd>
        <h3 style={{fontSize:15,fontWeight:700,color:WHITE,marginBottom:16}}>Profile Settings</h3>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14,marginBottom:14}}>
          <div>
            <label style={{fontSize:12,color:MUTED,display:"block",marginBottom:6}}>Full Name</label>
            <input value={name} onChange={e=>setName(e.target.value)} style={inp}
              onFocus={e=>e.target.style.borderColor="#7c3aed"} onBlur={e=>e.target.style.borderColor=BORDER}/>
          </div>
          <div>
            <label style={{fontSize:12,color:MUTED,display:"block",marginBottom:6}}>Email Address</label>
            <input value={email} onChange={e=>setEmail(e.target.value)} style={inp}
              onFocus={e=>e.target.style.borderColor="#7c3aed"} onBlur={e=>e.target.style.borderColor=BORDER}/>
          </div>
        </div>
        <div>
          <label style={{fontSize:12,color:MUTED,display:"block",marginBottom:6}}>Role</label>
          <input value={profile.role||"Admin"} readOnly style={{...inp,opacity:0.5,cursor:"not-allowed"}}/>
        </div>
      </Crd>
      <Crd>
        <h3 style={{fontSize:15,fontWeight:700,color:WHITE,marginBottom:16}}>Notification Preferences</h3>
        {[["email","Email Alerts","Receive alerts via email"],["slack","Slack Integration","Send alerts to Slack channel"],["webhook","Webhook Calls","POST alerts to custom endpoint"]].map(([k,lbl,desc])=>(
          <div key={k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 0",borderBottom:`1px solid ${BORDER}`}}>
            <div>
              <p style={{fontSize:13,fontWeight:600,color:WHITE}}>{lbl}</p>
              <p style={{fontSize:12,color:MUTED,marginTop:2}}>{desc}</p>
            </div>
            <Toggle on={notif[k]} onChange={()=>setNotif(p=>({...p,[k]:!p[k]}))}/>
          </div>
        ))}
      </Crd>
      <Crd>
        <h3 style={{fontSize:15,fontWeight:700,color:WHITE,marginBottom:16}}>API Configuration</h3>
        <div style={{marginBottom:12}}>
          <label style={{fontSize:12,color:MUTED,display:"block",marginBottom:6}}>API Key</label>
          <div style={{display:"flex",gap:10}}>
            <input value="••••••••••••••••abc123" readOnly style={{...inp,flex:1,fontFamily:"monospace",cursor:"not-allowed",opacity:0.7}}/>
            <button onClick={()=>{navigator.clipboard.writeText("abc123");}} style={{padding:"11px 16px",background:"rgba(255,255,255,0.05)",border:`1px solid ${BORDER}`,borderRadius:10,color:WHITE,cursor:"pointer"}}><Copy size={14}/></button>
          </div>
        </div>
        <div>
          <label style={{fontSize:12,color:MUTED,display:"block",marginBottom:6}}>Backend URL</label>
          <input value={API_URL} readOnly style={{...inp,fontFamily:"monospace",cursor:"not-allowed",opacity:0.7}}/>
        </div>
      </Crd>
      <div style={{display:"flex",gap:10}}>
        <button onClick={save} style={{background:saved?"#22c55e":"#7c3aed",border:"none",borderRadius:11,padding:"11px 28px",color:WHITE,fontSize:14,fontWeight:700,cursor:"pointer",transition:"background 0.3s"}}>{saved?"✓ Saved":"Save Changes"}</button>
        <button onClick={handleLogout} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:11,padding:"11px 22px",color:"#f87171",fontSize:14,fontWeight:600,cursor:"pointer"}}>Logout</button>
      </div>
    </div>
  );
}



/* ══ DOCS SECTION ══ */
function DocsSection(){
  const [activeDoc,setActiveDoc]=useState("Getting Started");
  const DOCS={
    "Getting Started":{icon:"🚀",content:[
      {title:"Installation",body:"Install the ObserveAI SDK in your Node.js project using npm or yarn. The SDK automatically instruments your APIs and sends metrics to your dashboard.\n\nnpm install observeai-sdk\n\nThen initialize it at the top of your app entry point."},
      {title:"Quick Setup",body:"Import and initialize the SDK with your API key. The SDK will automatically detect your Express/Fastify/Koa routes and begin collecting telemetry data in real time."},
      {title:"Environment Variables",body:`Set the following environment variables:\n\nOBSERVEAI_API_KEY=your_api_key\nOBSERVEAI_PROJECT_ID=your_project_id\nOBSERVEAI_BACKEND_URL=${API_URL}`},
    ]},
    "API Reference":{icon:"📘",content:[
      {title:"GET /api/metrics/mongodb",body:"Returns current MongoDB connection status, database name, collections count, and MongoDB version. Requires no authentication."},
      {title:"GET /api/system/health",body:"Returns system health metrics including CPU cores, CPU usage percentage, used/total memory, platform, hostname, uptime, and load averages."},
      {title:"GET /api/alerts",body:"Returns all active alerts. Each alert has a message, type (critical/warning/info), and service name. Supports filtering by type via query param."},
      {title:"GET /api/predictions",body:"Returns AI-powered failure predictions including probability score, risk level (high/medium/low), estimated failure time, and anomaly detection results."},
      {title:"POST /api/auth/login",body:"Authenticates a user. Request body: { email, password }. Returns a JWT token on success. Token expires in 24 hours."},
    ]},
    "SDK Guide":{icon:"🔧",content:[
      {title:"sendMetrics(serviceName)",body:"Call this function to push service metrics to your backend. Pass your service name as a string. Call every 5 seconds for real-time monitoring.\n\nimport { sendMetrics } from './sdk/metrics';\nsetInterval(() => sendMetrics('payment-service'), 5000);"},
      {title:"Multi-Service Tracking",body:"You can track multiple services simultaneously by calling sendMetrics with different service names. Each service gets its own analytics entry in the dashboard."},
      {title:"Custom Thresholds",body:"Configure alert thresholds in your Settings panel. Default thresholds: Error Rate > 5%, Latency > 500ms, CPU Usage > 80%."},
    ]},
    "Integrations":{icon:"🔌",content:[
      {title:"Slack Alerts",body:"Connect Slack to receive instant alert notifications. Go to Integrations → Slack → Connect. Enter your Slack webhook URL. Alerts will be posted to your chosen channel automatically."},
      {title:"Webhook Setup",body:"Configure a custom webhook endpoint to receive POST requests for every alert. Payload includes: service name, severity, message, timestamp, and metric values."},
      {title:"Grafana Dashboard",body:"Export metrics to Grafana using the Prometheus endpoint at /api/metrics/prometheus. Add it as a data source in Grafana and import our pre-built dashboard template."},
    ]},
  };
  const categories=Object.keys(DOCS);
  const current=DOCS[activeDoc];
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SHdr title="Documentation" subtitle="Guides, API reference, and SDK documentation for ObserveAI"/>
      <div style={{display:"grid",gridTemplateColumns:"220px 1fr",gap:16,minHeight:500}}>
        {/* sidebar */}
        <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:14,height:"fit-content"}}>
          <p style={{fontSize:10,color:MUTED,textTransform:"uppercase",letterSpacing:"0.18em",marginBottom:12,paddingLeft:8}}>Categories</p>
          {categories.map(cat=>(
            <button key={cat} onClick={()=>setActiveDoc(cat)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,border:activeDoc===cat?"1px solid rgba(139,92,246,0.28)":"1px solid transparent",background:activeDoc===cat?"rgba(124,58,237,0.15)":"transparent",color:activeDoc===cat?WHITE:MUTED,fontSize:13,fontWeight:activeDoc===cat?600:400,cursor:"pointer",marginBottom:4,textAlign:"left",transition:"all 0.15s"}}
              onMouseEnter={e=>{if(activeDoc!==cat){e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.color=WHITE;}}}
              onMouseLeave={e=>{if(activeDoc!==cat){e.currentTarget.style.background="transparent";e.currentTarget.style.color=MUTED;}}}>
              <span style={{fontSize:16}}>{DOCS[cat].icon}</span>
              <span>{cat}</span>
            </button>
          ))}
          <div style={{marginTop:16,padding:"12px",borderRadius:10,background:"rgba(124,58,237,0.08)",border:"1px solid rgba(124,58,237,0.15)"}}>
            <p style={{fontSize:11,color:"#a78bfa",fontWeight:600,marginBottom:4}}>Need help?</p>
            <p style={{fontSize:11,color:MUTED,lineHeight:1.6}}>Contact our support team or raise a GitHub issue.</p>
          </div>
        </div>
        {/* content */}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px 20px",background:CARD,border:`1px solid ${BORDER}`,borderRadius:16}}>
            <span style={{fontSize:28}}>{current.icon}</span>
            <div>
              <h2 style={{fontSize:18,fontWeight:800,color:WHITE}}>{activeDoc}</h2>
              <p style={{fontSize:12,color:MUTED,marginTop:2}}>{current.content.length} articles</p>
            </div>
          </div>
          {current.content.map((item,i)=>(
            <div key={i} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:"20px 22px"}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:22,height:22,borderRadius:999,background:"rgba(124,58,237,0.2)",border:"1px solid rgba(124,58,237,0.35)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#a78bfa",fontWeight:700}}>{i+1}</div>
                <h3 style={{fontSize:14,fontWeight:700,color:WHITE}}>{item.title}</h3>
              </div>
              <pre style={{fontSize:13,color:SL3,lineHeight:1.75,whiteSpace:"pre-wrap",fontFamily:"inherit",margin:0}}>{item.body}</pre>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ══ SUPPORT SECTION ══ */
function SupportSection(){
  const [ticket,setTicket]=useState({subject:"",desc:"",priority:"medium"});
  const [submitted,setSubmitted]=useState(false);
  const submit=()=>{if(!ticket.subject||!ticket.desc)return;setSubmitted(true);setTimeout(()=>setSubmitted(false),3000);setTicket({subject:"",desc:"",priority:"medium"});};
  const FAQS=[
    {q:"Why is my service showing as Critical?",a:"A service is marked Critical when its error rate exceeds 5% or latency exceeds 500ms for more than 2 minutes. Check the Failure Tracker for specific endpoint failures."},
    {q:"How do I connect the SDK to my service?",a:"Install the observeai-sdk package, import sendMetrics, and call it every 5 seconds with your service name. See the Docs → SDK Guide section for full instructions."},
    {q:"Why are MongoDB/Redis showing as failed?",a:"These toast notifications appear when the backend cannot reach MongoDB or Redis. Ensure both services are running and check your .env connection strings."},
    {q:"How do I reset my API key?",a:"Go to Settings → API Configuration. Contact your admin to regenerate the key. Update it in all services using the SDK."},
    {q:"Can I add custom alert thresholds?",a:"Yes. Go to Settings → Notification Preferences. Custom threshold configuration per service is available in the Pro plan."},
    {q:"How accurate are the AI predictions?",a:"The AI uses a Z-score based anomaly detection model trained on your service's baseline. Accuracy improves over time as more metrics are collected."},
  ];
  const inp={width:"100%",background:"#0a0a0c",border:`1px solid ${BORDER}`,borderRadius:10,padding:"11px 14px",color:WHITE,fontSize:13,outline:"none",boxSizing:"border-box",fontFamily:"inherit"};
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <SHdr title="Support" subtitle="Get help, raise tickets, and browse frequently asked questions"/>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:4}}>
        {[
          {icon:"📧",label:"Email Support",val:"support@observeai.dev",col:"violet"},
          {icon:"💬",label:"Live Chat",val:"Available 9am–6pm IST",col:"cyan"},
          {icon:"🐛",label:"Bug Reports",val:"github.com/observeai",col:"amber"},
        ].map((c,i)=>(
          <div key={i} style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:14,padding:"16px 18px",display:"flex",alignItems:"center",gap:14}}>
            <span style={{fontSize:28}}>{c.icon}</span>
            <div><p style={{fontSize:11,color:MUTED,marginBottom:3}}>{c.label}</p><p style={{fontSize:13,fontWeight:600,color:WHITE}}>{c.val}</p></div>
          </div>
        ))}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
        {/* ticket form */}
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:"20px 22px"}}>
            <h3 style={{fontSize:15,fontWeight:700,color:WHITE,marginBottom:16}}>Raise a Support Ticket</h3>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,color:MUTED,display:"block",marginBottom:6}}>Subject</label>
              <input value={ticket.subject} onChange={e=>setTicket(p=>({...p,subject:e.target.value}))} placeholder="Brief description of the issue" style={inp}
                onFocus={e=>e.target.style.borderColor="#7c3aed"} onBlur={e=>e.target.style.borderColor=BORDER}/>
            </div>
            <div style={{marginBottom:12}}>
              <label style={{fontSize:12,color:MUTED,display:"block",marginBottom:6}}>Priority</label>
              <select value={ticket.priority} onChange={e=>setTicket(p=>({...p,priority:e.target.value}))}
                style={{...inp,cursor:"pointer"}}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div style={{marginBottom:16}}>
              <label style={{fontSize:12,color:MUTED,display:"block",marginBottom:6}}>Description</label>
              <textarea value={ticket.desc} onChange={e=>setTicket(p=>({...p,desc:e.target.value}))} placeholder="Describe the issue in detail..." rows={5}
                style={{...inp,resize:"vertical",lineHeight:1.6}}
                onFocus={e=>e.target.style.borderColor="#7c3aed"} onBlur={e=>e.target.style.borderColor=BORDER}/>
            </div>
            <button onClick={submit}
              style={{width:"100%",background:submitted?"#22c55e":"#7c3aed",border:"none",borderRadius:11,padding:"11px",color:WHITE,fontSize:14,fontWeight:700,cursor:"pointer",transition:"background 0.3s"}}>
              {submitted?"✓ Ticket Submitted!":"Submit Ticket"}
            </button>
          </div>
        </div>
        {/* FAQs */}
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <div style={{background:CARD,border:`1px solid ${BORDER}`,borderRadius:16,padding:"20px 22px"}}>
            <h3 style={{fontSize:15,fontWeight:700,color:WHITE,marginBottom:16}}>Frequently Asked Questions</h3>
            {FAQS.map((faq,i)=>(
              <FAQItem key={i} q={faq.q} a={faq.a}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
function FAQItem({q,a}){
  const [open,setOpen]=useState(false);
  return(
    <div style={{borderBottom:`1px solid ${BORDER}`,paddingBottom:12,marginBottom:12}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"none",border:"none",color:WHITE,fontSize:13,fontWeight:600,cursor:"pointer",textAlign:"left",padding:0}}>
        <span>{q}</span>
        <span style={{color:MUTED,fontSize:16,flexShrink:0,marginLeft:8}}>{open?"−":"+"}</span>
      </button>
      {open&&<p style={{fontSize:13,color:SL3,marginTop:10,lineHeight:1.7}}>{a}</p>}
    </div>
  );
}

/* ══ SDK HEALTH PANEL (shown in sidebar) ══ */
function SdkHealthPanel({stats,onView}){
  const score=stats.healthScore||100;
  const color=score>=80?"#22c55e":score>=50?"#f59e0b":"#ef4444";
  const label=score>=80?"Healthy":score>=50?"Warning":"Critical";
  return(
    <div style={{margin:"0 8px 8px",borderRadius:12,border:`1px solid ${color}22`,background:`${color}0a`,padding:"12px 14px",cursor:"pointer"}} onClick={onView}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
        <span style={{fontSize:10,color:color,textTransform:"uppercase",letterSpacing:"0.15em",fontWeight:700}}>SDK Live</span>
        <span style={{fontSize:10,color:color,fontWeight:700,background:`${color}18`,borderRadius:999,padding:"2px 8px"}}>{label}</span>
      </div>
      {/* health bar */}
      <div style={{height:4,borderRadius:99,background:"rgba(255,255,255,0.07)",marginBottom:8,overflow:"hidden"}}>
        <div style={{width:`${score}%`,height:"100%",borderRadius:99,background:color,transition:"width 0.5s ease"}}/>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:4}}>
        {[
          {l:"Score",  v:`${score}/100`},
          {l:"Errors", v:`${stats.errorRate||0}%`},
          {l:"Latency",v:`${stats.avgLatency||0}ms`},
          {l:"Sent",   v:`${stats.sent||0}`},
        ].map((x,i)=>(
          <div key={i} style={{fontSize:10}}>
            <span style={{color:MUTED}}>{x.l}: </span>
            <span style={{color:SL3,fontWeight:600}}>{x.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AIDataSection({metrics,predictions,alerts,insights}){
  const latencyData=metrics.slice().reverse().map((item,index)=>({
    name:item.timestamp?new Date(item.timestamp).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):String(index+1),
    latency:Number(item.latency??item.requests?.responseTimeMs??0),
  }));
  const predictionData=predictions.slice().reverse().map((item,index)=>({
    name:item.timestamp?new Date(item.timestamp).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):String(index+1),
    latency:Number(item.predictedLatency??item.yhat??0),
  }));
  const items=[
    {label:"Metrics",value:metrics,empty:"No metric history"},
    {label:"Predictions",value:predictions,empty:"No predictions"},
    {label:"Alerts",value:alerts,empty:"No alerts"},
    {label:"Insights",value:insights,empty:"No root-cause insights"},
  ];
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14}}>
      {[
        {title:"Latency",data:latencyData,color:"#22d3ee",empty:"No latency history"},
        {title:"Prediction",data:predictionData,color:"#a78bfa",empty:"No predictions"},
      ].map(({title,data,color,empty})=><Crd key={title} style={{padding:16}}>
        <div style={{fontSize:12,fontWeight:700,color:SL3,marginBottom:10}}>{title} graph</div>
        {data.length?<ResponsiveContainer width="100%" height={180}>
          <LineChart data={data} margin={{top:8,right:8,left:-18,bottom:0}}>
            <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false}/>
            <XAxis dataKey="name" tick={{fontSize:9,fill:MUTED}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fontSize:9,fill:MUTED}} axisLine={false} tickLine={false} width={42}/>
            <Tooltip contentStyle={{background:CARD,border:"1px solid rgba(255,255,255,0.12)",borderRadius:8,color:WHITE,fontSize:11}}/>
            <Line type="monotone" dataKey="latency" stroke={color} strokeWidth={2} dot={false} activeDot={{r:4}}/>
          </LineChart>
        </ResponsiveContainer>:<div style={{height:180,display:"grid",placeItems:"center",fontSize:11,color:MUTED}}>{empty}</div>}
      </Crd>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gap:14}}>
    {items.map(({label,value,empty})=><Crd key={label} style={{padding:16}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
        <span style={{fontSize:12,fontWeight:700,color:SL3}}>{label}</span>
        <span style={{fontSize:11,color:"#a78bfa",background:"rgba(167,139,250,0.12)",padding:"3px 8px",borderRadius:999}}>{value.length}</span>
      </div>
      {value.slice(0,3).map((item,index)=><div key={item._id||index} style={{padding:"9px 0",borderTop:"1px solid rgba(255,255,255,0.06)",fontSize:11,color:MUTED,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
        {label==="Insights"?(item.rootCause||"Insight available"):label==="Predictions"?`${Number(item.predictedLatency||item.yhat||0).toFixed(0)}ms predicted latency`:label==="Alerts"?(item.message||`${Number(item.predictedLatency||0).toFixed(0)}ms anomaly`):`${item.serviceName||item.api_url||"Metric"} · ${item.latency??item.requests?.responseTimeMs??0}ms`}
      </div>)}
      {!value.length&&<div style={{fontSize:11,color:MUTED}}>{empty}</div>}
    </Crd>)}
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:14}}>
      <AlertsPanel alerts={alerts}/>
      <RootCauseCard insight={insights[0]}/>
    </div>
  </div>;
}

/* ══ OVERVIEW SECTION ══ */
function OverviewSection({mongoData,redisData,systemData,alerts,alertHistory,failures,predictions,trendChartData,trendServices,historyData,liveStats,logs,filteredLogs,fetchDashboardData,lastUpdated,sdkStats,apiMetrics,storedPredictions,storedAlerts,insights}){
  const fmtReq=(n)=>n>=1000?`${(n/1000).toFixed(1)}K`:`${n}`;
  const hasLive=liveStats.totalRequests>0||liveStats.totalServices>0;
  const dR=liveStats.prevRequests?Math.abs(liveStats.totalRequests-liveStats.prevRequests):null;
  const dE=liveStats.prevErrorRate?Math.abs(liveStats.avgErrorRate-liveStats.prevErrorRate).toFixed(2):null;
  const dL=liveStats.prevLatency?Math.abs(liveStats.avgLatency-liveStats.prevLatency):null;
  const dI=liveStats.prevIncidents?Math.abs(liveStats.incidents-liveStats.prevIncidents):null;
  return(
    <div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <div>
          <h1 style={{fontSize:22,fontWeight:900,color:WHITE,letterSpacing:"-0.4px"}}>Overview</h1>
          <p style={{fontSize:13,color:MUTED,marginTop:4}}>Real-time observability and AI-powered failure prediction</p>
          <p style={{fontSize:11,color:DIM,marginTop:2}}>Last updated: {lastUpdated}</p>
        </div>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <GBtn><Clock size={14} color={MUTED}/> Last 1 hour <ChevronDown size={12} color={MUTED}/></GBtn>
          <GBtn onClick={fetchDashboardData} style={{padding:"7px 10px"}}><RefreshCw size={14} color={MUTED}/></GBtn>
          <button style={{display:"flex",alignItems:"center",gap:7,background:"#7c3aed",border:"none",borderRadius:11,padding:"8px 16px",color:WHITE,fontSize:13,fontWeight:600,cursor:"pointer",boxShadow:"0 0 22px rgba(124,58,237,0.35)"}}
            onMouseEnter={e=>e.currentTarget.style.background="#6d28d9"}
            onMouseLeave={e=>e.currentTarget.style.background="#7c3aed"}>
            <Plus size={14}/> Add Service
          </button>
        </div>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:14}}>
        <SCrd title="Total Services"  value={hasLive?liveStats.totalServices:"8"}         delta="2"                       up={true}  iconEl={<IBox col="violet"><Box size={16}/></IBox>}/>
        <SCrd title="Total Requests"  value={hasLive?fmtReq(liveStats.totalRequests):"125.7K"} delta={dR?fmtReq(dR):"15.3%"} up={liveStats.totalRequests>=liveStats.prevRequests} iconEl={<IBox col="cyan"><TrendingUp size={16}/></IBox>}/>
        <SCrd title="Error Rate"      value={hasLive?`${liveStats.avgErrorRate}%`:"2.48%"} delta={dE?`${dE}%`:"0.6%"}     up={false} iconEl={<IBox col="red"><AlertTriangle size={16}/></IBox>}/>
        <SCrd title="Avg. Latency"    value={hasLive&&liveStats.avgLatency>0?`${liveStats.avgLatency}ms`:"243ms"} delta={dL?`${dL}ms`:"18ms"} up={false} iconEl={<IBox col="amber"><Clock size={16}/></IBox>}/>
        <SCrd title="Incidents"       value={hasLive?liveStats.incidents:alerts.filter(a=>a.type==="critical").length||"3"} delta={dI!==null?String(dI):"1"} up={false} iconEl={<IBox col="orange"><ShieldAlert size={16}/></IBox>}/>
      </div>

      <AIDataSection metrics={apiMetrics} predictions={storedPredictions} alerts={storedAlerts} insights={insights}/>

      {/* ── SDK Live Status Banner ── */}
      {sdkStats&&(()=>{
        const s=sdkStats;
        const score=s.healthScore||100;
        const color=score>=80?"#22c55e":score>=50?"#f59e0b":"#ef4444";
        return(
          <div style={{borderRadius:14,border:`1px solid ${color}30`,background:`${color}08`,padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div style={{width:10,height:10,borderRadius:999,background:color,boxShadow:`0 0 10px ${color}`,flexShrink:0}}/>
              <div>
                <span style={{fontSize:13,fontWeight:700,color:WHITE}}>ObserveAI SDK v2.0</span>
                <span style={{fontSize:11,color:MUTED,marginLeft:10}}>Auto-tracking active · dashboard-ui service</span>
              </div>
            </div>
            <div style={{display:"flex",gap:20,flexWrap:"wrap"}}>
              {[
                {l:"Health Score",v:`${score}/100`,c:color},
                {l:"Requests",   v:`${s.totalRequests||0}`,c:SL3},
                {l:"Error Rate", v:`${s.errorRate||0}%`,   c:s.errorRate>5?"#f87171":"#4ade80"},
                {l:"Avg Latency",v:`${s.avgLatency||0}ms`, c:SL3},
                {l:"Sent",       v:`${s.sent||0}`,         c:"#a78bfa"},
                {l:"Retries",    v:`${s.failed||0}`,       c:s.failed>0?"#f87171":MUTED},
              ].map((x,i)=>(
                <div key={i} style={{textAlign:"center"}}>
                  <div style={{fontSize:14,fontWeight:700,color:x.c}}>{x.v}</div>
                  <div style={{fontSize:10,color:MUTED}}>{x.l}</div>
                </div>
              ))}
            </div>
          </div>
        );
      })()}

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 300px",gap:14}}>
        <Crd>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <h3 style={{fontSize:14,fontWeight:700,color:WHITE}}>Request Volume <span style={{color:DIM,fontWeight:400,fontSize:12}}>ⓘ</span></h3>
            <GBtn style={{padding:"5px 10px",fontSize:12}}>Requests <ChevronDown size={11}/></GBtn>
          </div>
          <ResponsiveContainer width="100%" height={185}>
            <LineChart data={REQVOL} margin={{top:4,right:4,left:-28,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="time" tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
              <Tooltip contentStyle={TTC} cursor={{stroke:"rgba(255,255,255,0.06)"}} formatter={v=>[`${(v/1000).toFixed(2)}K`,"Requests"]}/>
              <Line type="monotone" dataKey="requests" stroke="#a855f7" strokeWidth={2.5} dot={false} activeDot={{fill:"#a855f7",r:4,strokeWidth:0}}/>
            </LineChart>
          </ResponsiveContainer>
        </Crd>
        <Crd>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <h3 style={{fontSize:14,fontWeight:700,color:WHITE}}>Error Rate (%) <span style={{color:DIM,fontWeight:400,fontSize:12}}>ⓘ</span></h3>
            <GBtn style={{padding:"5px 10px",fontSize:12}}>Percentage <ChevronDown size={11}/></GBtn>
          </div>
          <ResponsiveContainer width="100%" height={185}>
            <LineChart data={trendChartData} margin={{top:4,right:4,left:-28,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="time" tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis domain={[0,6]} tickFormatter={v=>`${v}%`} tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={TTC} cursor={{stroke:"rgba(255,255,255,0.06)"}} formatter={v=>[`${Number(v).toFixed(2)}%`,"Error Rate"]}/>
              {trendServices.map((s,i)=><Line key={s} type="monotone" dataKey={s} stroke={TREND_COLORS[i%TREND_COLORS.length]} strokeWidth={2.5} dot={false} connectNulls/>)}
            </LineChart>
          </ResponsiveContainer>
        </Crd>
        <Crd>
          <h3 style={{fontSize:14,fontWeight:700,color:WHITE,marginBottom:18}}>Top Services by Error Rate</h3>
          <div style={{display:"flex",flexDirection:"column",gap:14}}>
            {TOPSVC.map((s,i)=>(
              <div key={i}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                  <span style={{fontSize:13,color:SL4}}>{s.service}</span>
                  <span style={{fontSize:13,fontWeight:600,color:WHITE}}>{s.rate}%</span>
                </div>
                <div style={{height:4,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}>
                  <div style={{width:`${s.pct}%`,height:"100%",borderRadius:99,background:"linear-gradient(90deg,#ef4444,#f97316)"}}/>
                </div>
              </div>
            ))}
          </div>
        </Crd>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 300px",gap:14}}>
        <Crd>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <h3 style={{fontSize:14,fontWeight:700,color:WHITE}}>Average Latency (ms) <span style={{color:DIM,fontSize:12}}>ⓘ</span></h3>
            <GBtn style={{padding:"5px 10px",fontSize:12}}>Milliseconds <ChevronDown size={11}/></GBtn>
          </div>
          <ResponsiveContainer width="100%" height={165}>
            <LineChart data={LATDATA} margin={{top:4,right:4,left:-28,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="time" tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={TTC} cursor={{stroke:"rgba(255,255,255,0.06)"}}/>
              <Line type="monotone" dataKey="latency" stroke="#f59e0b" strokeWidth={2.5} dot={false} activeDot={{fill:"#f59e0b",r:4,strokeWidth:0}}/>
            </LineChart>
          </ResponsiveContainer>
        </Crd>
        <Crd>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <h3 style={{fontSize:14,fontWeight:700,color:WHITE}}>Latency Distribution (ms) <span style={{color:DIM,fontSize:12}}>ⓘ</span></h3>
            <GBtn style={{padding:"5px 10px",fontSize:12}}>Milliseconds <ChevronDown size={11}/></GBtn>
          </div>
          <ResponsiveContainer width="100%" height={165}>
            <BarChart data={LATDIST} margin={{top:4,right:4,left:-28,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="range" tick={{fill:MUTED,fontSize:9}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false} tickFormatter={v=>`${(v/1000).toFixed(0)}K`}/>
              <Tooltip contentStyle={TTC} cursor={{fill:"rgba(255,255,255,0.03)"}}/>
              <Bar dataKey="count" fill="#6366f1" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        </Crd>
        <Crd>
          <h3 style={{fontSize:14,fontWeight:700,color:WHITE,marginBottom:14}}>Service Health</h3>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            <PieChart width={115} height={115}>
              <Pie data={SHEALTH} cx={54} cy={54} innerRadius={34} outerRadius={52} paddingAngle={3} dataKey="value" startAngle={90} endAngle={-270}>
                {SHEALTH.map((e,i)=><Cell key={i} fill={e.color} stroke="transparent"/>)}
              </Pie>
              <text x={57} y={51} textAnchor="middle" dominantBaseline="middle" fill={WHITE} fontSize={20} fontWeight={900}>8</text>
              <text x={57} y={66} textAnchor="middle" dominantBaseline="middle" fill={MUTED} fontSize={10}>Total</text>
            </PieChart>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {SHEALTH.map(item=>(
                <div key={item.name} style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:8,height:8,borderRadius:999,background:item.color,flexShrink:0}}/>
                  <span style={{fontSize:12,color:MUTED}}>{item.name}</span>
                  <span style={{fontSize:12,fontWeight:700,color:WHITE,marginLeft:"auto",paddingLeft:10}}>{item.value} ({((item.value/8)*100).toFixed(1)}%)</span>
                </div>
              ))}
            </div>
          </div>
        </Crd>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 300px",gap:14}}>
        <Crd>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <h3 style={{fontSize:14,fontWeight:700,color:WHITE}}>Recent Incidents</h3>
            <button style={{background:"transparent",border:"none",color:"#a78bfa",fontSize:13,cursor:"pointer"}}>View all</button>
          </div>
          <table style={{width:"100%",borderCollapse:"collapse"}}>
            <thead><tr style={{borderBottom:`1px solid ${BORDER}`}}>
              {["Incident","Service","Severity","Status","Started At"].map(h=>(
                <th key={h} style={{textAlign:"left",fontSize:11,color:MUTED,fontWeight:500,paddingBottom:10,paddingRight:14}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {[
                {incident:"High error rate in payment API",service:"Payment Service",severity:"critical",status:"Investigating",time:"May 26 15:12"},
                {incident:"Database connection timeout",service:"Auth Service",severity:"high",status:"Identified",time:"May 26 14:48"},
                {incident:"Slow response time detected",service:"Order Service",severity:"medium",status:"Monitoring",time:"May 26 14:15"},
                {incident:"Spike in 500 errors",service:"Inventory Svc",severity:"high",status:"Resolved",time:"May 26 13:50"},
              ].map((row,i)=>(
                <tr key={i} style={{borderBottom:`1px solid rgba(255,255,255,0.04)`}}>
                  <td style={{padding:"11px 14px 11px 0",fontSize:13,color:SL3}}>{row.incident}</td>
                  <td style={{padding:"11px 14px 11px 0",fontSize:13,color:MUTED}}>{row.service}</td>
                  <td style={{padding:"11px 14px 11px 0"}}><span style={bdg(row.severity)}>{row.severity}</span></td>
                  <td style={{padding:"11px 14px 11px 0",fontSize:13,fontWeight:600,color:statusCol[row.status]||SL3}}>{row.status}</td>
                  <td style={{padding:"11px 0 11px 0",fontSize:11,color:MUTED}}>{row.time}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Crd>
        <Crd glow="red" style={{position:"relative"}}>
          <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at top right,rgba(239,68,68,0.09),transparent 60%)",borderRadius:16,pointerEvents:"none"}}/>
          <div style={{position:"relative"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <h3 style={{fontSize:14,fontWeight:700,color:WHITE}}>AI Failure Prediction</h3>
              <button style={{background:"transparent",border:"none",color:"#a78bfa",fontSize:13,cursor:"pointer"}}>View all</button>
            </div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
              <span style={{fontSize:13,color:MUTED}}>{predictions[0]?.service||"Payment Service"}</span>
              <span style={bdg("critical")}>High Risk</span>
            </div>
            <div style={{fontSize:44,fontWeight:900,color:WHITE,lineHeight:1}}>{predictions[0]?.probability||78}%</div>
            <div style={{fontSize:11,color:MUTED,marginTop:4}}>Failure Probability</div>
            <div style={{marginTop:12}}><div style={{fontSize:11,color:MUTED,marginBottom:4}}>Estimated Failure Time</div>
              <div style={{fontSize:17,fontWeight:900,color:WHITE}}>{predictions[0]?.eta||"15 – 25 min"}</div>
            </div>
            <div style={{marginTop:12,height:4,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}>
              <div style={{width:`${predictions[0]?.probability||78}%`,height:"100%",borderRadius:99,background:"linear-gradient(90deg,#ef4444,#f97316,#fbbf24)",boxShadow:"0 0 12px rgba(239,68,68,0.4)"}}/>
            </div>
            <ResponsiveContainer width="100%" height={75} style={{marginTop:12}}>
              <LineChart data={[{t:"15:00",v:20},{t:"15:10",v:28},{t:"15:20",v:35},{t:"15:30",v:50},{t:"15:40",v:62},{t:"15:50",v:71},{t:"16:00",v:predictions[0]?.probability||78}]} margin={{top:4,right:0,left:-40,bottom:0}}>
                <XAxis dataKey="t" tick={{fill:MUTED,fontSize:9}} axisLine={false} tickLine={false}/>
                <YAxis tick={false} axisLine={false} tickLine={false}/>
                <Line type="monotone" dataKey="v" stroke="#ef4444" strokeWidth={2} dot={false}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Crd>
      </div>

      <Crd>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div>
            <p style={{fontSize:10,textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(167,139,250,0.7)",marginBottom:3}}>LIVE MONITORING</p>
            <h3 style={{fontSize:14,fontWeight:700,color:WHITE}}>System Trend</h3>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:16}}>
            {[{l:"CPU %",c:"#a855f7"},{l:"Memory %",c:"#22d3ee"}].map(x=>(
              <div key={x.l} style={{display:"flex",alignItems:"center",gap:6}}>
                <div style={{width:18,height:3,borderRadius:2,background:x.c}}/><span style={{fontSize:12,color:MUTED}}>{x.l}</span>
              </div>
            ))}
            <Activity size={16} color="#a78bfa"/>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={185}>
          <LineChart data={historyData} margin={{top:4,right:4,left:-28,bottom:0}}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
            <XAxis dataKey="time" tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false}/>
            <YAxis tick={{fill:MUTED,fontSize:10}} axisLine={false} tickLine={false}/>
            <Tooltip contentStyle={TTC} cursor={{stroke:"rgba(255,255,255,0.06)"}}/>
            <Line type="monotone" dataKey="cpu" stroke="#a855f7" strokeWidth={2.5} dot={false} name="CPU %"/>
            <Line type="monotone" dataKey="memory" stroke="#22d3ee" strokeWidth={2.5} dot={false} name="Memory %"/>
          </LineChart>
        </ResponsiveContainer>
      </Crd>

      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
        {[
          {glow:"green",sub:"Database",title:"MongoDB",col:"green",icon:<Database size={16}/>,rows:[
            ["Status",<span style={{background:"rgba(34,197,94,0.12)",color:"#4ade80",border:"1px solid rgba(34,197,94,0.2)",borderRadius:999,padding:"2px 10px",fontSize:11,fontWeight:600}}>{mongoData.status}</span>],
            ["Database",mongoData.database],["Collections",mongoData.collectionsCount],["Version",mongoData.mongodbVersion],
          ]},
          {glow:"cyan",sub:"Cache System",title:"Redis",col:"cyan",icon:<Database size={16}/>,rows:[
            ["Status",<span style={{background:"rgba(34,211,238,0.12)",color:"#22d3ee",border:"1px solid rgba(34,211,238,0.2)",borderRadius:999,padding:"2px 10px",fontSize:11,fontWeight:600}}>{redisData.status}</span>],
            ["Connected","Yes"],["Monitoring",<span style={{color:"#4ade80",fontWeight:600,fontSize:13}}>ACTIVE</span>],
          ]},
          {glow:"violet",sub:"System Health",title:"Server",col:"violet",icon:<Cpu size={16}/>,rows:[
            ["CPU Cores",systemData.cpuCores],
            ["CPU Usage",<span style={{color:"#fca5a5",fontWeight:600}}>{systemData.cpuUsage}</span>],
            ["Used Memory",systemData.usedMemory],["Platform",systemData.platform],
          ]},
        ].map((c,i)=>(
          <Crd key={i} glow={c.glow}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div>
                <p style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.18em",color:`rgba(${c.glow==="green"?"52,211,153":c.glow==="cyan"?"34,211,238":"139,92,246"},0.7)`,marginBottom:3}}>{c.sub}</p>
                <h3 style={{fontSize:16,fontWeight:900,color:WHITE}}>{c.title}</h3>
              </div>
              <IBox col={c.col}>{c.icon}</IBox>
            </div>
            {c.rows.map(([k,v])=>(
              <div key={k} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:9}}>
                <span style={{fontSize:13,color:MUTED}}>{k}</span>
                <span style={{fontSize:13,fontWeight:600,color:WHITE}}>{v}</span>
              </div>
            ))}
          </Crd>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
        <Crd glow="red">
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <div><p style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(239,68,68,0.7)",marginBottom:3}}>Incidents</p>
              <h3 style={{fontSize:14,fontWeight:700,color:WHITE}}>Active Alerts</h3></div>
            <Bell size={16} color="#f87171"/>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {alerts.map((a,i)=>(
              <div key={i} style={{padding:"11px 14px",borderRadius:12,...(a.type==="critical"?{background:"rgba(239,68,68,0.07)",border:"1px solid rgba(239,68,68,0.17)"}:a.type==="warning"?{background:"rgba(245,158,11,0.07)",border:"1px solid rgba(245,158,11,0.17)"}:{background:"rgba(34,197,94,0.07)",border:"1px solid rgba(34,197,94,0.17)"})}}>
                <p style={{fontSize:13,fontWeight:600,color:WHITE}}>{a.message}</p>
                <p style={{fontSize:10,color:MUTED,marginTop:4,textTransform:"uppercase",letterSpacing:"0.09em"}}>{a.type} · {a.service}</p>
              </div>
            ))}
          </div>
        </Crd>
        <Crd>
          <div style={{marginBottom:14}}>
            <p style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(249,115,22,0.7)",marginBottom:3}}>Timeline</p>
            <h3 style={{fontSize:14,fontWeight:700,color:WHITE}}>Alert History</h3>
          </div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {alertHistory.map(a=>(
              <div key={a._id} style={{padding:"11px 14px",borderRadius:12,border:`1px solid ${BORDER}`,background:"rgba(255,255,255,0.02)"}}>
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:10}}>
                  <div style={{flex:1}}>
                    <span style={bdg(a.severity)}>{a.severity}</span>
                    <p style={{fontSize:13,fontWeight:600,color:WHITE,marginTop:7}}>{a.message}</p>
                    <p style={{fontSize:11,color:MUTED,marginTop:3}}>{a.service}</p>
                  </div>
                  <p style={{fontSize:11,color:DIM,whiteSpace:"nowrap"}}>{new Date(a.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </Crd>
      </div>

      <Crd>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div><p style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.18em",color:MUTED,marginBottom:3}}>System Logs</p>
            <h3 style={{fontSize:14,fontWeight:700,color:WHITE}}>Log Stream</h3></div>
          <FileText size={16} color={MUTED}/>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:5,fontFamily:"monospace"}}>
          {(filteredLogs.length>0?filteredLogs:logs).map((l,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,borderRadius:7,padding:"8px 11px",...(l.type==="error"?{background:"rgba(239,68,68,0.07)",color:"#fca5a5"}:l.type==="warning"?{background:"rgba(245,158,11,0.07)",color:"#fcd34d"}:{background:"rgba(255,255,255,0.03)",color:SL3})}}>
              <span style={{fontSize:9,fontWeight:700,textTransform:"uppercase",letterSpacing:"0.09em",marginTop:2,flexShrink:0,color:l.type==="error"?"#ef4444":l.type==="warning"?"#f59e0b":"#22c55e"}}>[{l.type}]</span>
              <span style={{fontSize:12}}>{l.message}</span>
            </div>
          ))}
        </div>
      </Crd>

      <Crd>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
          <div><p style={{fontSize:9,textTransform:"uppercase",letterSpacing:"0.18em",color:"rgba(239,68,68,0.7)",marginBottom:3}}>API Failures</p>
            <h3 style={{fontSize:14,fontWeight:700,color:WHITE}}>Failure Tracker</h3></div>
          <AlertTriangle size={16} color="#f87171"/>
        </div>
        <table style={{width:"100%",borderCollapse:"collapse"}}>
          <thead><tr style={{borderBottom:`1px solid ${BORDER}`}}>
            {["Endpoint","Service","Status","Count"].map(h=>(
              <th key={h} style={{textAlign:"left",fontSize:11,color:MUTED,fontWeight:500,paddingBottom:9,paddingRight:16}}>{h}</th>
            ))}
          </tr></thead>
          <tbody>{failures.map((f,i)=>(
            <tr key={i} style={{borderBottom:`1px solid rgba(255,255,255,0.04)`}}>
              <td style={{padding:"10px 16px 10px 0",fontSize:12,fontFamily:"monospace",color:SL3}}>{f.endpoint}</td>
              <td style={{padding:"10px 16px 10px 0",fontSize:13,color:MUTED}}>{f.service}</td>
              <td style={{padding:"10px 16px 10px 0"}}><span style={bdg("critical")}>{f.status}</span></td>
              <td style={{padding:"10px 0 10px 0",fontSize:13,fontWeight:700,color:WHITE}}>{f.count}</td>
            </tr>
          ))}</tbody>
        </table>
      </Crd>

      <div style={{display:"flex",gap:12,paddingBottom:20}}>
        <button onClick={()=>window.open(`${API_URL}/api/pdf-report`,"_blank")} style={{display:"flex",alignItems:"center",gap:8,background:"#4f46e5",border:"none",borderRadius:11,padding:"10px 20px",color:WHITE,fontSize:13,fontWeight:600,cursor:"pointer",boxShadow:"0 0 20px rgba(79,70,229,0.3)"}}
          onMouseEnter={e=>e.currentTarget.style.background="#4338ca"} onMouseLeave={e=>e.currentTarget.style.background="#4f46e5"}>
          <FileText size={14}/> Download PDF Report
        </button>
        <button onClick={()=>window.open(`${API_URL}/api/send-alert-email`,"_blank")} style={{display:"flex",alignItems:"center",gap:8,background:"#dc2626",border:"none",borderRadius:11,padding:"10px 20px",color:WHITE,fontSize:13,fontWeight:600,cursor:"pointer",boxShadow:"0 0 20px rgba(220,38,38,0.3)"}}
          onMouseEnter={e=>e.currentTarget.style.background="#b91c1c"} onMouseLeave={e=>e.currentTarget.style.background="#dc2626"}>
          <Bell size={14}/> Send Test Alert Email
        </button>
      </div>
    </div>
  );
}


/* ══ MAIN DASHBOARD ══ */
export default function Dashboard(){
  const navigate = useNavigate();
  const [mongoData,setMongoData]=useState(MOCK.mongo);
  const [redisData,setRedisData]=useState(MOCK.redis);
  const [systemData,setSystemData]=useState(MOCK.system);
  const [alerts,setAlerts]=useState(MOCK.alerts);
  const [logs,setLogs]=useState(MOCK.logs);
  const [failures,setFailures]=useState(MOCK.failures);
  const [predictions,setPredictions]=useState(MOCK.predictions);
  const [profile,setProfile]=useState(MOCK.profile);
  const [alertHistory,setAlertHistory]=useState(MOCK.alertHistory);
  const [trendData,setTrendData]=useState(TREND_FB);
  const [analytics,setAnalytics]=useState(MOCK.analytics);
  const [rootCauses,setRootCauses]=useState(MOCK.rootCauses);
  const [deepAnalysis,setDeepAnalysis]=useState(MOCK.deepAnalysis);
  const [report,setReport]=useState(null);
  const [liveStats,setLiveStats]=useState({totalServices:0,totalRequests:0,avgErrorRate:0,avgLatency:0,incidents:0,prevRequests:0,prevErrorRate:0,prevLatency:0,prevIncidents:0});
  const [searchTerm,setSearchTerm]=useState("");
  const [lastUpdated,setLastUpdated]=useState(new Date().toLocaleTimeString());
  const [historyData,setHistoryData]=useState([]);
  const [sidebarOpen,setSidebarOpen]=useState(true);
  const [activeNav,setActiveNav]=useState("Overview");
  const [showUpgradeModal,setShowUpgradeModal]=useState(false);
  const [showProfileMenu,setShowProfileMenu]=useState(false);
  const [showNotifPanel,setShowNotifPanel]=useState(false);
  const [apiMetrics,setApiMetrics]=useState([]);
  const [storedPredictions,setStoredPredictions]=useState([]);
  const [storedAlerts,setStoredAlerts]=useState([]);
  const [insights,setInsights]=useState([]);

  const handleLogout = () => {
    console.log("Logout clicked");

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    navigate("/login", { replace: true });

    // optional hard reset to clear state
    window.location.reload();
  };

  useEffect(()=>{
    if(!localStorage.getItem("token")){
      navigate("/login", { replace: true });
    }
  },[navigate]);

  /* ── SDK refs ── */
  const sdkRef     = useRef(null);
  const [sdkStats, setSdkStats] = useState({ healthScore:100, healthStatus:"healthy", errorRate:0, avgLatency:0, totalRequests:0, sent:0, failed:0 });

  useEffect(()=>{
    let socket;
    try{
      socket=io(API_URL,{transports:["websocket"]});
      socket.on("alerts",(d)=>setAlerts(d));
      socket.on("predictions",(d)=>setPredictions(d));
      socket.on("failures",(d)=>setFailures(d));
      socket.on("root-cause",(d)=>setRootCauses(d));
      socket.on("deep-analysis",(d)=>setDeepAnalysis(d));
      socket.on("analytics-update",()=>fetchData());
    }catch(e){}
    return()=>{if(socket)socket.disconnect();};
  },[]);

  async function fetchData(){
    try{
      const token=localStorage.getItem("token");
      const H={Authorization:`Bearer ${token}`};
      const [mongo,redis,system,alertRes,alertHistRes,logRes,failRes,predRes,analyticsRes,trendsRes,rcRes,deepRes,reportRes,profileRes]=await Promise.allSettled([
        api.get("/api/metrics/mongodb"),
        api.get("/api/metrics/redis"),
        api.get("/api/system/health"),
        api.get("/api/alerts"),
        api.get("/api/alerts/history"),
        api.get("/api/logs"),
        api.get("/api/failures"),
        api.get("/api/predictions"),
        api.get("/api/analytics"),
        api.get("/api/analytics/trends"),
        api.get("/api/root-cause"),
        api.get("/api/deep-analysis"),
        api.get("/api/report"),
        token ? api.get("/api/auth/profile",{headers:H}) : Promise.reject('no-token'),
      ]);
      if(mongo.status==="fulfilled") setMongoData(mongo.value.data);
      if(redis.status==="fulfilled") setRedisData(redis.value.data);
      if(system.status==="fulfilled"){
        setSystemData(system.value.data);
        setHistoryData(p=>[...p.slice(-15),{time:new Date().toLocaleTimeString(),cpu:parseFloat(system.value.data.cpuUsage||0),memory:parseFloat(system.value.data.usedMemory||0)}]);
      }
      if(alertRes.status==="fulfilled")     setAlerts(alertRes.value.data.alerts??alertRes.value.data);
      if(alertHistRes.status==="fulfilled") setAlertHistory(alertHistRes.value.data.alerts||[]);
      if(logRes.status==="fulfilled")       setLogs(logRes.value.data.logs??logRes.value.data);
      if(failRes.status==="fulfilled")      setFailures(failRes.value.data.failures??failRes.value.data);
      if(predRes.status==="fulfilled")      setPredictions(predRes.value.data.predictions??predRes.value.data);
      if(rcRes.status==="fulfilled")        setRootCauses(rcRes.value.data.rootCauses||[]);
      if(deepRes.status==="fulfilled")      setDeepAnalysis(deepRes.value.data.analysis||MOCK.deepAnalysis);
      if(reportRes.status==="fulfilled")    setReport(reportRes.value.data.report);
      if(profileRes.status==="fulfilled")   setProfile(profileRes.value.data.user);
      if(trendsRes.status==="fulfilled")    setTrendData(trendsRes.value.data.trends||TREND_FB);
      if(analyticsRes.status==="fulfilled"){
        const rows=analyticsRes.value.data.analytics||[];
        setAnalytics(rows);
        if(rows.length>0){
          const totalReqs=rows.reduce((s,r)=>s+(r.totalRequests||0),0);
          const avgErr=rows.reduce((s,r)=>s+(r.errorRate||0),0)/rows.length;
          const sysD=system.status==="fulfilled"?system.value.data:null;
          const avgLat=sysD?Math.round((sysD.loadAverage?.[0]||0)*100):0;
          setLiveStats(prev=>({totalServices:rows.length,totalRequests:totalReqs,avgErrorRate:+avgErr.toFixed(2),avgLatency:avgLat,incidents:alertRes.status==="fulfilled"?(alertRes.value.data.alerts??alertRes.value.data).filter(a=>a.type==="critical").length:prev.incidents,prevRequests:prev.totalRequests,prevErrorRate:prev.avgErrorRate,prevLatency:prev.avgLatency,prevIncidents:prev.incidents}));
        }
      }
      const [historyRes, storedPredRes, storedAlertsRes, insightsRes] = await Promise.allSettled([
        api.get("/metrics/history"),
        api.get("/predictions"),
        api.get("/alerts"),
        api.get("/insights"),
      ]);
      if(historyRes.status==="fulfilled") setApiMetrics(historyRes.value.data.data||[]);
      if(storedPredRes.status==="fulfilled") setStoredPredictions(storedPredRes.value.data.data||[]);
      if(storedAlertsRes.status==="fulfilled") setStoredAlerts(storedAlertsRes.value.data.data||[]);
      if(insightsRes.status==="fulfilled") setInsights(insightsRes.value.data.data||[]);
      /* toasts only shown once on initial load via toastShown ref */
      setLastUpdated(new Date().toLocaleTimeString());
    }catch(e){console.log("Fetch error:",e);}
  }

  useEffect(()=>{
    /* ── Seed mock history ── */
    setHistoryData(Array.from({length:10},(_,i)=>({
      time:`15:${String(i*5).padStart(2,"0")}`,
      cpu:+(Math.random()*40+20).toFixed(1),
      memory:+(Math.random()*30+50).toFixed(1),
    })));

    /* ── Start ObserveAI SDK ── */
    let sdk = null;
    try { sdk = new ObserveAI({
      serviceName:    "dashboard-ui",
      backendUrl:     `${API_URL}/api/ingest`,
      batchSize:      5,
      flushInterval:  5000,
      retryAttempts:  3,
      retryDelay:     1000,
      healthInterval: 10000,
      debug:          false,
    }); } catch(sdkErr) { console.warn('[ObserveAI] SDK init failed:', sdkErr.message); }
    if(sdk) { sdk.start(); sdkRef.current = sdk; }

    /* ── Poll SDK stats into state every 5s ── */
    const sdkPoll = setInterval(()=>{
      if(!sdkRef.current) return;
      const s = sdkRef.current.getStats();
      setSdkStats({ ...s });
      /* push CPU/memory into live history from SDK */
      setHistoryData(p=>[...p.slice(-20),{
        time: new Date().toLocaleTimeString(),
        cpu:  Math.min(100, Math.round(s.avgLatency / 10) || +(Math.random()*40+20).toFixed(1)),
        memory: Math.round(50 + (s.totalRequests % 30)),
      }]);
    }, 5000);

    /* ── Backend polling ── */
    fetchData();
    const iv = setInterval(fetchData, 30000); // 30s to reduce spam

    /* ── Fallback history when SDK offline ── */
    const hiv = setInterval(()=>{
      setLastUpdated(new Date().toLocaleTimeString());
    }, 3000);

    return()=>{
      if(sdkRef.current) { sdkRef.current.stop(); }
      clearInterval(iv);
      clearInterval(hiv);
      clearInterval(sdkPoll);
    };
  },[]);

  const trendServices=useMemo(()=>[...new Set(trendData.map(d=>d.service))],[trendData]);
  const trendChartData=useMemo(()=>{const rows=new Map();trendData.forEach(item=>{const row=rows.get(item.time)||{time:item.time};row[item.service]=Number(item.errorRate||0);rows.set(item.time,row);});return Array.from(rows.values());},[trendData]);
  const filteredLogs=logs.filter(l=>l.message?.toLowerCase().includes(searchTerm.toLowerCase())||l.type?.toLowerCase().includes(searchTerm.toLowerCase()));

  /* ── Global search: compute results across all data ── */
  const searchResults = useMemo(()=>{
    if(!searchTerm.trim()) return [];
    const q = searchTerm.toLowerCase();
    const results = [];
    SERVICES_LIST.forEach(s=>{
      if(s.name.toLowerCase().includes(q)||s.endpoint.toLowerCase().includes(q))
        results.push({section:"Services",label:s.name,sub:s.endpoint,dot:s.status==="critical"?"#ef4444":s.status==="warning"?"#f59e0b":"#22c55e",go:"Services"});
    });
    ENDPOINTS_LIST.forEach(e=>{
      if(e.path.toLowerCase().includes(q)||e.service.toLowerCase().includes(q))
        results.push({section:"Endpoints",label:e.path,sub:`${e.method} · ${e.service}`,status:e.status>=500?"critical":e.status>=400?"warning":"healthy",go:"Endpoints"});
    });
    alerts.forEach(a=>{
      if(a.message?.toLowerCase().includes(q)||a.service?.toLowerCase().includes(q))
        results.push({section:"Alerts",label:a.message,sub:a.service,dot:a.type==="critical"?"#ef4444":a.type==="warning"?"#f59e0b":"#22c55e",go:"Alerts"});
    });
    INCIDENTS_LIST.forEach(inc=>{
      if(inc.title.toLowerCase().includes(q)||inc.service.toLowerCase().includes(q))
        results.push({section:"Incidents",label:inc.title,sub:inc.service,dot:inc.severity==="critical"?"#ef4444":inc.severity==="high"?"#f97316":"#f59e0b",go:"Incidents"});
    });
    logs.forEach(l=>{
      if(l.message?.toLowerCase().includes(q))
        results.push({section:"Logs",label:l.message,sub:l.type,dot:l.type==="error"?"#ef4444":l.type==="warning"?"#f59e0b":"#22c55e",go:"Overview"});
    });
    TEAM_MEMBERS.forEach(m=>{
      if(m.name.toLowerCase().includes(q)||m.role.toLowerCase().includes(q)||m.email.toLowerCase().includes(q))
        results.push({section:"Team",label:m.name,sub:`${m.role} · ${m.email}`,dot:"#a78bfa",go:"Team"});
    });
    return results.slice(0,12);
  },[searchTerm, alerts, logs]);
  const SW=sidebarOpen?210:64;

  const renderSection=()=>{
    const p={mongoData,redisData,systemData,alerts,alertHistory,failures,predictions,trendChartData,trendServices,historyData,liveStats,logs,filteredLogs,fetchDashboardData:fetchData,lastUpdated,analytics,rootCauses,deepAnalysis,profile,report,searchTerm,sdkStats,apiMetrics,storedPredictions,storedAlerts,insights};
    switch(activeNav){
      case "Overview":       return <OverviewSection {...p}/>;
      case "Services":       return <ServicesSection searchTerm={searchTerm}/>;
      case "Endpoints":      return <EndpointsSection searchTerm={searchTerm}/>;
      case "Dashboards":     return <DashboardsSection historyData={historyData} trendChartData={trendChartData} trendServices={trendServices} analytics={analytics}/>;
      case "Alerts":         return <AlertsSection alerts={alerts} alertHistory={alertHistory} searchTerm={searchTerm}/>;
      case "Incidents":      return <IncidentsSection failures={failures} searchTerm={searchTerm}/>;
      case "AI Predictions": return <AIPredictionsSection predictions={predictions} rootCauses={rootCauses} deepAnalysis={deepAnalysis}/>;
      case "Reports":        return <ReportsSection/>;
      case "Chaos Testing":  return <ChaosSection/>;
      case "Integrations":   return <IntegrationsSection/>;
      case "Team":           return <TeamSection profile={profile} searchTerm={searchTerm}/>;
      case "Settings":       return <SettingsSection profile={profile} handleLogout={handleLogout}/>;
      case "Docs":           return <DocsSection/>;
      case "Support":        return <SupportSection/>;
      default:               return <OverviewSection {...p}/>;
    }
  };

  /* ── Upgrade Plan Modal ── */
  const UpgradeModal=()=>(
    <div onClick={()=>setShowUpgradeModal(false)} style={{position:"fixed",inset:0,zIndex:200,background:"rgba(0,0,0,0.7)",backdropFilter:"blur(6px)",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0d0d0f",border:"1px solid rgba(139,92,246,0.3)",borderRadius:20,padding:"32px",width:"100%",maxWidth:680,boxShadow:"0 0 80px rgba(124,58,237,0.25)"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
          <div>
            <h2 style={{fontSize:20,fontWeight:900,color:WHITE}}>Upgrade Your Plan</h2>
            <p style={{fontSize:13,color:MUTED,marginTop:4}}>Choose the plan that fits your infrastructure scale</p>
          </div>
          <button onClick={()=>setShowUpgradeModal(false)} style={{background:"rgba(255,255,255,0.06)",border:`1px solid ${BORDER}`,borderRadius:8,width:32,height:32,display:"flex",alignItems:"center",justifyContent:"center",color:MUTED,cursor:"pointer",fontSize:16}}>✕</button>
        </div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14,marginBottom:20}}>
          {[
            {name:"Starter",price:"Free",color:"#64748b",features:["3 Services","Basic Monitoring","Email Alerts","7-day history","Community Support"],current:false},
            {name:"Pro",price:"₹999/mo",color:"#7c3aed",features:["10 Services","AI Predictions","All Alert Channels","30-day history","Priority Support","Chaos Testing"],current:true},
            {name:"Enterprise",price:"Custom",color:"#f59e0b",features:["Unlimited Services","Custom AI Models","Dedicated Support","1-year history","SLA Guarantee","On-premise deploy"],current:false},
          ].map((plan,i)=>(
            <div key={i} style={{borderRadius:14,border:`2px solid ${plan.current?"rgba(124,58,237,0.5)":plan.name==="Enterprise"?"rgba(245,158,11,0.3)":"rgba(255,255,255,0.07)"}`,background:plan.current?"rgba(124,58,237,0.08)":"rgba(255,255,255,0.02)",padding:"20px 18px",position:"relative"}}>
              {plan.current&&<div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:"#7c3aed",color:"white",fontSize:10,fontWeight:700,borderRadius:999,padding:"3px 12px",whiteSpace:"nowrap"}}>CURRENT PLAN</div>}
              <div style={{marginBottom:14}}>
                <div style={{fontSize:15,fontWeight:800,color:WHITE,marginBottom:4}}>{plan.name}</div>
                <div style={{fontSize:22,fontWeight:900,color:plan.color}}>{plan.price}</div>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:18}}>
                {plan.features.map((f,j)=>(
                  <div key={j} style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{color:plan.color,fontSize:12}}>✓</span>
                    <span style={{fontSize:12,color:SL3}}>{f}</span>
                  </div>
                ))}
              </div>
              <button onClick={()=>{if(!plan.current){toast.success(`Upgrading to ${plan.name} — Redirecting to payment...`);setTimeout(()=>setShowUpgradeModal(false),1500);}}}
                style={{width:"100%",padding:"9px",borderRadius:9,border:`1px solid ${plan.current?"rgba(124,58,237,0.4)":plan.name==="Enterprise"?"rgba(245,158,11,0.3)":"rgba(255,255,255,0.1)"}`,background:plan.current?"rgba(124,58,237,0.2)":plan.name==="Enterprise"?"rgba(245,158,11,0.1)":"rgba(255,255,255,0.05)",color:plan.current?"#a78bfa":plan.name==="Enterprise"?"#fbbf24":MUTED,fontSize:12,fontWeight:700,cursor:plan.current?"default":"pointer"}}>
                {plan.current?"Current Plan":plan.name==="Enterprise"?"Contact Sales":"Upgrade →"}
              </button>
            </div>
          ))}
        </div>
        <p style={{textAlign:"center",fontSize:12,color:MUTED}}>💳 Secure payments · Cancel anytime · No hidden fees</p>
      </div>
    </div>
  );

  /* ── Profile Dropdown ── */
  const ProfileMenu=()=>(
    <div style={{position:"absolute",top:52,right:0,zIndex:300,background:"#0d0d0f",border:`1px solid ${BORDER}`,borderRadius:14,padding:"8px",minWidth:220,boxShadow:"0 16px 40px rgba(0,0,0,0.6)"}}>
      <div style={{padding:"12px",borderBottom:`1px solid ${BORDER}`,marginBottom:6}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:36,height:36,borderRadius:999,background:"linear-gradient(135deg,#7c3aed,#22d3ee)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,fontWeight:900}}>{profile.name?.charAt(0)||"A"}</div>
          <div>
            <div style={{fontSize:13,fontWeight:700,color:WHITE}}>{profile.name}</div>
            <div style={{fontSize:11,color:MUTED}}>{profile.email}</div>
          </div>
        </div>
        <div style={{marginTop:10,display:"flex",gap:6,flexWrap:"wrap"}}>
          <span style={{background:"rgba(124,58,237,0.15)",color:"#a78bfa",border:"1px solid rgba(124,58,237,0.25)",borderRadius:999,padding:"2px 10px",fontSize:11,fontWeight:600}}>👑 {profile.role||"Admin"}</span>
          <span style={{background:"rgba(34,197,94,0.12)",color:"#4ade80",border:"1px solid rgba(34,197,94,0.2)",borderRadius:999,padding:"2px 10px",fontSize:11,fontWeight:600}}>● Online</span>
        </div>
      </div>
      {[
        {icon:"⚙️",label:"Settings",action:()=>{setActiveNav("Settings");setShowProfileMenu(false);}},
        {icon:"👥",label:"Team",action:()=>{setActiveNav("Team");setShowProfileMenu(false);}},
        {icon:"📄",label:"Reports",action:()=>{setActiveNav("Reports");setShowProfileMenu(false);}},
        {icon:"🔑",label:"API Keys",action:()=>{setActiveNav("Settings");setShowProfileMenu(false);}},
      ].map((item,i)=>(
        <button key={i} onClick={item.action}
          style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:9,border:"none",background:"transparent",color:SL3,fontSize:13,cursor:"pointer",textAlign:"left"}}
          onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.05)";e.currentTarget.style.color=WHITE;}}
          onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=SL3;}}>
          <span style={{fontSize:15}}>{item.icon}</span>{item.label}
        </button>
      ))}
      <div style={{borderTop:`1px solid ${BORDER}`,marginTop:6,paddingTop:6}}>
        <button onClick={handleLogout}
          style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:9,border:"none",background:"transparent",color:"#f87171",fontSize:13,cursor:"pointer"}}
          onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.09)"}
          onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
          <LogOut size={14}/>Logout
        </button>
      </div>
    </div>
  );

  /* ── Notification Panel ── */
  const NotifPanel=()=>(
    <div style={{position:"absolute",top:52,right:0,zIndex:300,background:"#0d0d0f",border:`1px solid ${BORDER}`,borderRadius:14,width:340,boxShadow:"0 16px 40px rgba(0,0,0,0.6)",overflow:"hidden"}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"14px 16px",borderBottom:`1px solid ${BORDER}`}}>
        <h3 style={{fontSize:14,fontWeight:700,color:WHITE}}>Notifications</h3>
        <span style={{background:"#ef4444",color:"white",fontSize:10,fontWeight:700,borderRadius:999,padding:"2px 8px"}}>{alerts.length}</span>
      </div>
      <div style={{maxHeight:360,overflowY:"auto"}}>
        {alerts.map((a,i)=>(
          <div key={i}
            style={{display:"flex",alignItems:"flex-start",gap:12,padding:"12px 16px",borderBottom:`1px solid rgba(255,255,255,0.04)`,cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(255,255,255,0.03)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}
            onClick={()=>{setActiveNav("Alerts");setShowNotifPanel(false);}}>
            <div style={{width:8,height:8,borderRadius:999,marginTop:5,flexShrink:0,background:a.type==="critical"?"#ef4444":a.type==="warning"?"#f59e0b":"#22c55e"}}/>
            <div style={{flex:1}}>
              <p style={{fontSize:12,fontWeight:600,color:WHITE,lineHeight:1.4}}>{a.message}</p>
              <p style={{fontSize:11,color:MUTED,marginTop:3}}>{a.service} · {a.type}</p>
            </div>
            <span style={bdg(a.type==="critical"?"critical":a.type==="warning"?"warning":"info")}>{a.type}</span>
          </div>
        ))}
      </div>
      <div style={{padding:"10px 16px",borderTop:`1px solid ${BORDER}`}}>
        <button onClick={()=>{setActiveNav("Alerts");setShowNotifPanel(false);}}
          style={{width:"100%",padding:"8px",borderRadius:9,background:"rgba(124,58,237,0.12)",border:"1px solid rgba(124,58,237,0.2)",color:"#a78bfa",fontSize:12,fontWeight:600,cursor:"pointer"}}>
          View All Alerts →
        </button>
      </div>
    </div>
  );

  return(
    <div style={{display:"flex",minHeight:"100vh",background:BG,color:WHITE,fontFamily:"'Inter',system-ui,sans-serif"}}>
      {showUpgradeModal&&<UpgradeModal/>}
      {searchTerm.trim()&&(
        <div onClick={()=>setSearchTerm("")} style={{position:"fixed",inset:0,zIndex:490}}/>
      )}
      {(showProfileMenu||showNotifPanel)&&(
        <div onClick={()=>{setShowProfileMenu(false);setShowNotifPanel(false);setSearchTerm("");}} style={{position:"fixed",inset:0,zIndex:250}}/>
      )}

      {/* SIDEBAR */}
      <aside style={{position:"fixed",left:0,top:0,zIndex:50,width:SW,height:"100vh",background:SIDE,borderRight:`1px solid ${BSUB}`,display:"flex",flexDirection:"column",transition:"width 0.25s ease",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",gap:12,padding:"16px",borderBottom:`1px solid ${BSUB}`,flexShrink:0}}>
          <div style={{flexShrink:0,width:32,height:32,borderRadius:8,background:"linear-gradient(135deg,#7c3aed,#4f46e5)",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 0 20px rgba(124,58,237,0.45)"}}><Zap size={15} color="white"/></div>
          {sidebarOpen&&<div><div style={{fontSize:13,fontWeight:900,color:WHITE,lineHeight:1}}>API Failure</div><div style={{fontSize:10,color:"#a78bfa",fontWeight:600,marginTop:2}}>Predictor</div><div style={{fontSize:9,color:DIM,letterSpacing:"0.12em",marginTop:1}}>AI-Powered Observability</div></div>}
        </div>
        {sidebarOpen&&(
          <div style={{padding:"14px 16px",borderBottom:`1px solid ${BSUB}`,flexShrink:0}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:11,color:MUTED}}>Current Plan</span><Crown size={12} color="#fbbf24"/></div>
            <div style={{fontSize:13,fontWeight:700,color:WHITE}}>Pro Plan</div>
            <div style={{fontSize:11,color:MUTED,marginTop:3}}>7 / 10 Services</div>
            <div style={{marginTop:7,height:4,borderRadius:99,background:"rgba(255,255,255,0.07)",overflow:"hidden"}}><div style={{width:"70%",height:"100%",borderRadius:99,background:"linear-gradient(90deg,#7c3aed,#6366f1)"}}/></div>
            <button onClick={()=>setShowUpgradeModal(true)}
              style={{marginTop:10,width:"100%",fontSize:12,fontWeight:600,color:"#a78bfa",border:"1px solid rgba(139,92,246,0.28)",borderRadius:8,padding:"6px 0",background:"transparent",cursor:"pointer"}}
              onMouseEnter={e=>e.currentTarget.style.background="rgba(139,92,246,0.1)"}
              onMouseLeave={e=>e.currentTarget.style.background="transparent"}>Upgrade Plan</button>
          </div>
        )}
        <nav style={{flex:1,overflowY:"auto",padding:"10px 8px"}}>
          {NAV.map(({Icon,label,badge:b})=>{
            const active=activeNav===label;
            return(
              <button key={label} onClick={()=>setActiveNav(label)}
                style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:12,border:active?"1px solid rgba(139,92,246,0.28)":"1px solid transparent",background:active?"rgba(124,58,237,0.16)":"transparent",color:active?WHITE:MUTED,fontSize:13,fontWeight:500,cursor:"pointer",transition:"all 0.15s",marginBottom:2,textAlign:"left"}}
                onMouseEnter={e=>{if(!active){e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.color=WHITE;}}}
                onMouseLeave={e=>{if(!active){e.currentTarget.style.background="transparent";e.currentTarget.style.color=MUTED;}}}>
                <Icon size={15} color={active?"#a78bfa":"currentColor"} style={{flexShrink:0}}/>
                {sidebarOpen&&<span style={{flex:1}}>{label}</span>}
                {sidebarOpen&&b&&<span style={{background:"#ef4444",color:"white",fontSize:9,fontWeight:700,borderRadius:999,minWidth:17,height:17,display:"flex",alignItems:"center",justifyContent:"center",padding:"0 4px"}}>{b}</span>}
              </button>
            );
          })}
        </nav>
        {sidebarOpen&&(
          <div style={{padding:"12px 16px",borderTop:`1px solid ${BSUB}`,flexShrink:0}}>
            <p style={{fontSize:9,color:DIM,textTransform:"uppercase",letterSpacing:"0.18em",marginBottom:7}}>Your API Key</p>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",borderRadius:8,border:`1px solid ${BORDER}`,background:"rgba(255,255,255,0.03)",padding:"7px 11px"}}>
              <span style={{fontSize:12,color:SL3,letterSpacing:"0.15em"}}>••••••abc123</span>
              <Copy size={12} color={DIM} style={{cursor:"pointer"}} onClick={()=>{navigator.clipboard.writeText("abc123");}}/>
            </div>
          </div>
        )}
        <div style={{padding:"0 8px 14px",flexShrink:0}}>
          {/* SDK health mini panel */}
          <SdkHealthPanel stats={sdkStats} onView={()=>setActiveNav("Overview")}/>
          {sidebarOpen&&[["Docs",BookOpen,"Docs"],["Support",Shield,"Support"]].map(([lbl,Ico,nav])=>(
            <button key={lbl} onClick={()=>setActiveNav(nav)}
              style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:12,border:activeNav===nav?"1px solid rgba(139,92,246,0.28)":"1px solid transparent",background:activeNav===nav?"rgba(124,58,237,0.16)":"transparent",color:activeNav===nav?WHITE:MUTED,fontSize:13,cursor:"pointer",marginBottom:2,transition:"all 0.15s"}}
              onMouseEnter={e=>{if(activeNav!==nav){e.currentTarget.style.background="rgba(255,255,255,0.04)";e.currentTarget.style.color=WHITE;}}}
              onMouseLeave={e=>{if(activeNav!==nav){e.currentTarget.style.background="transparent";e.currentTarget.style.color=MUTED;}}}>
              <Ico size={15}/><span>{lbl}</span>
            </button>
          ))}
          <button onClick={handleLogout}
            style={{width:"100%",display:"flex",alignItems:"center",gap:10,padding:"9px 12px",borderRadius:12,border:"1px solid transparent",background:"transparent",color:"#f87171",fontSize:13,cursor:"pointer"}}
            onMouseEnter={e=>e.currentTarget.style.background="rgba(239,68,68,0.09)"}
            onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
            <LogOut size={15} style={{flexShrink:0}}/>{sidebarOpen&&<span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <div style={{flex:1,display:"flex",flexDirection:"column",minHeight:"100vh",marginLeft:SW,transition:"margin-left 0.25s ease"}}>
        <header style={{position:"sticky",top:0,zIndex:40,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"10px 24px",borderBottom:`1px solid ${BSUB}`,background:"rgba(8,8,9,0.96)",backdropFilter:"blur(18px)"}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <button onClick={()=>setSidebarOpen(o=>!o)} style={{padding:8,borderRadius:8,border:"none",background:"transparent",color:MUTED,cursor:"pointer"}}
              onMouseEnter={e=>{e.currentTarget.style.background="rgba(255,255,255,0.06)";e.currentTarget.style.color=WHITE;}}
              onMouseLeave={e=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color=MUTED;}}><Menu size={16}/></button>
            <div style={{position:"relative"}}>
              <div style={{display:"flex",alignItems:"center",gap:9,background:"rgba(255,255,255,0.04)",border:`1px solid ${searchTerm?"rgba(124,58,237,0.5)":BORDER}`,borderRadius:12,padding:"7px 14px",width:320,transition:"border-color 0.2s",boxShadow:searchTerm?"0 0 0 3px rgba(124,58,237,0.1)":"none"}}>
                <Search size={14} color={searchTerm?"#a78bfa":MUTED}/>
                <input type="text" placeholder="Search services, endpoints, alerts..."
                  value={searchTerm}
                  onChange={e=>setSearchTerm(e.target.value)}
                  onKeyDown={e=>{
                    if(e.key==="Escape") setSearchTerm("");
                    if(e.key==="Enter"&&searchResults.length>0){setActiveNav(searchResults[0].go);setSearchTerm("");}
                  }}
                  style={{background:"transparent",border:"none",outline:"none",fontSize:13,color:WHITE,width:"100%"}}/>
                {searchTerm
                  ? <button onClick={()=>setSearchTerm("")} style={{background:"rgba(255,255,255,0.08)",border:"none",color:WHITE,cursor:"pointer",padding:"2px 7px",borderRadius:5,fontSize:11,flexShrink:0}}>✕</button>
                  : <span style={{fontSize:10,color:DIM,border:`1px solid rgba(255,255,255,0.09)`,borderRadius:4,padding:"2px 6px",fontFamily:"monospace",flexShrink:0}}>⌘K</span>
                }
              </div>
              {searchTerm.trim()&&(
                <div style={{position:"absolute",top:46,left:0,zIndex:500,background:"#0c0c0e",border:`1px solid rgba(124,58,237,0.35)`,borderRadius:14,overflow:"hidden",boxShadow:"0 20px 60px rgba(0,0,0,0.8)",minWidth:400}}>
                  {searchResults.length>0?(
                    <>
                      <div style={{padding:"8px 14px 6px",borderBottom:`1px solid ${BORDER}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                        <span style={{fontSize:11,color:MUTED}}>{searchResults.length} result{searchResults.length!==1?"s":""} for <span style={{color:"#a78bfa",fontWeight:600}}>"{searchTerm}"</span></span>
                        <span style={{fontSize:10,color:DIM}}>↵ Enter · Esc to clear</span>
                      </div>
                      {["Services","Endpoints","Alerts","Incidents","Logs","Team"].map(sec=>{
                        const items=searchResults.filter(r=>r.section===sec);
                        if(!items.length) return null;
                        return(
                          <div key={sec}>
                            <div style={{padding:"7px 14px 3px",fontSize:10,color:DIM,textTransform:"uppercase",letterSpacing:"0.15em",fontWeight:600,background:"rgba(255,255,255,0.015)"}}>{sec}</div>
                            {items.map((r,i)=>(
                              <div key={i} onClick={()=>{setActiveNav(r.go);setSearchTerm("");}}
                                style={{display:"flex",alignItems:"center",gap:12,padding:"9px 14px",cursor:"pointer",transition:"background 0.1s"}}
                                onMouseEnter={e=>e.currentTarget.style.background="rgba(124,58,237,0.1)"}
                                onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                                <div style={{width:7,height:7,borderRadius:999,flexShrink:0,background:r.dot}}/>
                                <div style={{flex:1,minWidth:0}}>
                                  <div style={{fontSize:13,color:WHITE,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.label}</div>
                                  <div style={{fontSize:11,color:MUTED,marginTop:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.sub}</div>
                                </div>
                                <span style={{fontSize:10,color:"#a78bfa",background:"rgba(124,58,237,0.12)",borderRadius:6,padding:"2px 8px",flexShrink:0,whiteSpace:"nowrap"}}>→ {r.go}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })}
                      <div style={{padding:"8px 14px",borderTop:`1px solid ${BORDER}`,display:"flex",justifyContent:"center"}}>
                        <button onClick={()=>setSearchTerm("")} style={{fontSize:11,color:MUTED,background:"none",border:"none",cursor:"pointer"}}>Clear search</button>
                      </div>
                    </>
                  ):(
                    <div style={{padding:"24px 14px",textAlign:"center"}}>
                      <div style={{fontSize:24,marginBottom:8}}>🔍</div>
                      <div style={{fontSize:13,color:SL3}}>No results for <span style={{color:WHITE,fontWeight:600}}>"{searchTerm}"</span></div>
                      <div style={{fontSize:11,color:MUTED,marginTop:4}}>Try a service name, endpoint path, or alert message</div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button style={{padding:8,borderRadius:8,border:"none",background:"transparent",color:MUTED,cursor:"pointer"}}><Moon size={16}/></button>
            {/* Notification Bell */}
            <div style={{position:"relative"}}>
              <button onClick={()=>{setShowNotifPanel(o=>!o);setShowProfileMenu(false);}}
                style={{position:"relative",padding:8,borderRadius:8,border:"none",background:showNotifPanel?"rgba(255,255,255,0.06)":"transparent",color:showNotifPanel?WHITE:MUTED,cursor:"pointer"}}>
                <Bell size={16}/>
                <span style={{position:"absolute",top:4,right:4,width:16,height:16,borderRadius:999,background:"#ef4444",color:"white",fontSize:9,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>{alerts.length||5}</span>
              </button>
              {showNotifPanel&&<NotifPanel/>}
            </div>
            {/* Profile */}
            <div style={{position:"relative"}}>
              <div onClick={()=>{setShowProfileMenu(o=>!o);setShowNotifPanel(false);}}
                style={{display:"flex",alignItems:"center",gap:9,paddingLeft:8,cursor:"pointer"}}>
                <div style={{width:32,height:32,borderRadius:999,background:"linear-gradient(135deg,#7c3aed,#22d3ee)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:900,boxShadow:"0 0 15px rgba(124,58,237,0.4)"}}>{profile.name?.charAt(0)||"A"}</div>
                <div><div style={{fontSize:13,fontWeight:600,color:WHITE,lineHeight:1}}>{profile.name}</div><div style={{fontSize:11,color:MUTED,marginTop:2}}>{profile.role||"Admin"}</div></div>
                <ChevronDown size={12} color={MUTED} style={{transform:showProfileMenu?"rotate(180deg)":"rotate(0)",transition:"transform 0.2s"}}/>
              </div>
              {showProfileMenu&&<ProfileMenu/>}
            </div>
          </div>
        </header>

        {/* BREADCRUMB */}
        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 24px",borderBottom:`1px solid ${BSUB}`,background:"rgba(8,8,9,0.5)"}}>
          <span style={{fontSize:12,color:MUTED,cursor:"pointer"}} onClick={()=>setActiveNav("Overview")}>Dashboard</span>
          <ChevronRight size={12} color={MUTED}/>
          <span style={{fontSize:12,color:WHITE,fontWeight:500}}>{activeNav}</span>

        </div>

        <main style={{flex:1,overflowY:"auto",padding:24}}>
          {renderSection()}
        </main>
      </div>

      <ToastContainer position="bottom-right" theme="dark" toastStyle={{background:CARD,border:`1px solid ${BORDER}`,color:WHITE}}/>
    </div>
  );
}
