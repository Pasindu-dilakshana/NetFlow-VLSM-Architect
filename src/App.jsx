import { useState, useMemo, useEffect } from 'react'

// --- THE MATH ENGINE ---
const ipToInt = (ip) => {
  try { return ip.split('.').reduce((int, octet) => (int << 8) + parseInt(octet, 10), 0) >>> 0; } catch { return 0; }
};
const intToIp = (int) => [(int >>> 24) & 255, (int >>> 16) & 255, (int >>> 8) & 255, int & 255].join('.');
const cidrToMask = (cidr) => intToIp((0xFFFFFFFF << (32 - cidr)) >>> 0);

const getTrueNetworkAddress = (ipStr, cidrVal) => {
  try {
    let ipInt = ipToInt(ipStr);
    let mask = (0xFFFFFFFF << (32 - cidrVal)) >>> 0;
    return intToIp((ipInt & mask) >>> 0);
  } catch { return ipStr; }
};

function App() {
  const [ipVersion, setIpVersion] = useState(() => localStorage.getItem('na_version') || 'v4'); 
  const [majorNetwork, setMajorNetwork] = useState(() => localStorage.getItem('na_network') || '192.168.1.0');
  const [cidr, setCidr] = useState(() => parseInt(localStorage.getItem('na_cidr')) || 24);
  const [departments, setDepartments] = useState(() => JSON.parse(localStorage.getItem('na_depts')) || []); 
  
  const [isAdvancedMode, setIsAdvancedMode] = useState(() => localStorage.getItem('na_adv') === 'true');
  const [ciscoDeviceType, setCiscoDeviceType] = useState('l3switch');

  const [newDeptName, setNewDeptName] = useState(''); 
  const [newDeptHosts, setNewDeptHosts] = useState(''); 
  const [newDeptVlan, setNewDeptVlan] = useState(''); 
  const [isCalculated, setIsCalculated] = useState(false);
  const [copiedText, setCopiedText] = useState(null);
  const [showCorrectionToast, setShowCorrectionToast] = useState(false);

  useEffect(() => {
    localStorage.setItem('na_version', ipVersion);
    localStorage.setItem('na_network', majorNetwork);
    localStorage.setItem('na_cidr', cidr.toString());
    localStorage.setItem('na_depts', JSON.stringify(departments));
    localStorage.setItem('na_adv', isAdvancedMode);
  }, [ipVersion, majorNetwork, cidr, departments, isAdvancedMode]);

  const handleVersionChange = (version) => {
    setIpVersion(version); setIsCalculated(false); 
    if (version === 'v6') { setMajorNetwork('2001:db8::'); setCidr(64); } 
    else { setMajorNetwork('192.168.1.0'); setCidr(24); }
  };

  const handleModeSwitch = (mode) => {
    setIsAdvancedMode(mode);
    if (!mode) {
      const cleanedDepts = departments.map(dept => ({ ...dept, vlan: '' }));
      setDepartments(cleanedDepts);
    }
  };

  const handleClearAll = () => {
    if (window.confirm("Are you sure you want to clear all network requirements?")) {
      setDepartments([]); setIsCalculated(false); setNewDeptName(''); setNewDeptHosts(''); setNewDeptVlan('');
    }
  };

  const handleAddDepartment = () => {
    if (newDeptName && (ipVersion === 'v6' || newDeptHosts)) {
      setDepartments([...departments, { 
        name: newDeptName, 
        hosts: ipVersion === 'v6' ? 0 : parseInt(newDeptHosts), 
        vlan: isAdvancedMode ? newDeptVlan : '' 
      }]);
      setNewDeptName(''); setNewDeptHosts(''); setNewDeptVlan(''); setIsCalculated(false);
    }
  };

  const handleRemoveDepartment = (indexToRemove) => {
    setDepartments(departments.filter((_, index) => index !== indexToRemove)); setIsCalculated(false);
  };

  const handleGenerate = () => {
    if (ipVersion === 'v4') {
      const trueNetwork = getTrueNetworkAddress(majorNetwork, cidr);
      if (trueNetwork !== majorNetwork) {
        setMajorNetwork(trueNetwork);
        setShowCorrectionToast(true); setTimeout(() => setShowCorrectionToast(false), 4000); 
      }
    }
    setIsCalculated(true);
  };

  const handleCopy = (text) => {
    if(!text || text === "-" || text.includes("Insufficient")) return;
    navigator.clipboard.writeText(text);
    setCopiedText(text); setTimeout(() => setCopiedText(null), 2000); 
  };

  const calculationResults = useMemo(() => {
    if (!isCalculated || departments.length === 0) return null;
    if (ipVersion === 'v4') {
      let sortedDepts = [...departments].sort((a, b) => b.hosts - a.hosts);
      let currentIpInt = ipToInt(majorNetwork);
      let totalNetworkCapacity = Math.pow(2, 32 - cidr);
      let usedCapacity = 0; let results = [];

      for (let dept of sortedDepts) {
        let blockSize = Math.pow(2, Math.ceil(Math.log2(dept.hosts + 2)));
        let allocatedCidr = 32 - Math.log2(blockSize);

        if (usedCapacity + blockSize > totalNetworkCapacity) {
          results.push({ name: dept.name, vlan: dept.vlan, cidr: allocatedCidr, networkAddress: "⚠️ OUT OF BOUNDS", usableRange: "Insufficient Capacity", broadcastAddress: "-", isOverflow: true });
          usedCapacity += blockSize; 
        } else {
          results.push({ name: dept.name, vlan: dept.vlan, cidr: allocatedCidr, subnetMask: cidrToMask(allocatedCidr), gatewayAddress: intToIp(currentIpInt + 1), networkAddress: intToIp(currentIpInt), usableRange: `${intToIp(currentIpInt + 1)} - ${intToIp(currentIpInt + blockSize - 2)}`, broadcastAddress: intToIp(currentIpInt + blockSize - 1), isOverflow: false });
          currentIpInt += blockSize; usedCapacity += blockSize;
        }
      }
      return { results, usedCapacity, totalNetworkCapacity };
    } else {
      return { results: departments.map(d => ({ name: d.name, vlan: d.vlan, cidr: 64, networkAddress: `2001:db8:abcd:${Math.floor(Math.random()*1000)}::`, usableRange: "SLAAC", broadcastAddress: "Anycast", isOverflow: false })), usedCapacity: "N/A", totalNetworkCapacity: "Infinite" };
    }
  }, [isCalculated, departments, majorNetwork, cidr, ipVersion]);

  const downloadJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(calculationResults, null, 2));
    const a = document.createElement('a'); a.href = dataStr; a.download = `network_config.json`; a.click();
  };

  const downloadPDF = () => window.print();

  const downloadCiscoConfig = () => {
    if (!calculationResults || calculationResults.results.length === 0) return;
    let configText = `! --- CISCO ${ciscoDeviceType === 'l3switch' ? 'L3 SWITCH (SVI)' : 'ROUTER (ROAS)'} CONFIGURATION ---\n!\n`;
    if (ciscoDeviceType === 'router') configText += `interface GigabitEthernet0/0\n description Main_Trunk_Link\n no shutdown\n!\n`;

    calculationResults.results.forEach(res => {
      if (res.isOverflow || !res.vlan) return; 
      if (ciscoDeviceType === 'l3switch') {
        configText += `vlan ${res.vlan}\n name ${res.name.replace(/\s+/g, '_')}\n!\n`;
        configText += `interface Vlan${res.vlan}\n description ${res.name.replace(/\s+/g, '_')}_Gateway\n ip address ${res.gatewayAddress} ${res.subnetMask}\n no shutdown\n!\n`;
      } else {
        configText += `interface GigabitEthernet0/0.${res.vlan}\n description ${res.name.replace(/\s+/g, '_')}_Gateway\n encapsulation dot1Q ${res.vlan}\n ip address ${res.gatewayAddress} ${res.subnetMask}\n!\n`;
      }
    });
    const dataStr = "data:text/plain;charset=utf-8," + encodeURIComponent(configText);
    const a = document.createElement('a'); a.href = dataStr; a.download = `cisco_config.txt`; a.click();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 p-8 font-sans selection:bg-emerald-500/30 print:bg-white print:text-black print:p-0 relative">
      
      {/* Toast Notification */}
      <div className={`fixed top-8 left-1/2 -translate-x-1/2 bg-emerald-600/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl border border-emerald-400 flex items-center space-x-3 transition-all duration-500 z-50 ${showCorrectionToast ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-10 pointer-events-none'}`}>
        <svg className="w-5 h-5 text-emerald-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span className="font-semibold text-sm">Auto-corrected invalid Host IP to true Network ID</span>
      </div>

      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row justify-between items-center gap-6 print:hidden">
        <div className="flex items-center space-x-4 group cursor-pointer">
          <div className="p-3 bg-slate-800 rounded-xl border border-slate-700/50 shadow-lg transition-transform duration-500 group-hover:rotate-12">
            {/* NEW ICON */}
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 19a2 2 0 100-4 2 2 0 000 4zM8 9a2 2 0 100-4 2 2 0 000 4zM16 14a2 2 0 100-4 2 2 0 000 4zM8 9v6M8 9l8 3" />
            </svg>
          </div>
          <div>
            {/* NEW BRANDING */}
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 tracking-tight">NetFlow</h1>
            <p className="text-slate-400 mt-1 text-sm tracking-widest uppercase font-bold">VISUAL SUBNET & VLAN ENGINE</p>
          </div>
        </div>

        <div className="flex bg-slate-900/80 p-1.5 rounded-2xl border border-slate-700/50 shadow-inner">
          <button onClick={() => handleVersionChange('v4')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${ipVersion === 'v4' ? 'bg-emerald-500 text-white shadow-lg scale-100' : 'text-slate-400 hover:bg-slate-800 scale-95'}`}>IPv4</button>
          <button onClick={() => handleVersionChange('v6')} className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${ipVersion === 'v6' ? 'bg-purple-500 text-white shadow-lg scale-100' : 'text-slate-400 hover:bg-slate-800 scale-95'}`}>IPv6</button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 print:block">
        
        {/* LEFT COLUMN */}
        <div className="lg:col-span-1 space-y-8 print:hidden">
          
          {/* Card 1: Major Network */}
          <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-2xl group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
            <h2 className="text-lg font-bold mb-5 text-emerald-400 flex items-center">
              <span className="bg-emerald-400/10 text-emerald-300 p-2 rounded-xl mr-3">1</span> Major Network ({ipVersion.toUpperCase()})
            </h2>
            <div className="flex items-center space-x-3 mb-2">
              <input type="text" value={majorNetwork} onChange={(e) => {setMajorNetwork(e.target.value); setIsCalculated(false)}} className="w-full bg-slate-950/80 border border-slate-700 rounded-2xl px-5 py-4 text-white font-mono text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 hover:border-slate-500 transition-all shadow-inner" />
              <span className="text-4xl text-slate-600 font-light">/</span>
              <input type="number" value={cidr} onChange={(e) => {setCidr(e.target.value); setIsCalculated(false)}} className="w-28 bg-slate-950/80 border border-slate-700 rounded-2xl px-5 py-4 text-white font-mono text-center text-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 hover:border-slate-500 transition-all shadow-inner" />
            </div>
          </div>

          {/* Card 2: Requirements */}
          <div className="bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-slate-700/50 shadow-2xl flex flex-col h-full lg:h-[480px] relative overflow-hidden transition-all duration-500">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500/50 to-transparent"></div>
            
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-emerald-400 flex items-center">
                <span className="bg-emerald-400/10 text-emerald-300 p-2 rounded-xl mr-3">2</span> Requirements
              </h2>

              <div className="flex bg-slate-950/80 p-1 rounded-xl border border-slate-700/50 shadow-inner">
                <button 
                  onClick={() => handleModeSwitch(false)} 
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${!isAdvancedMode ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
                >
                  Basic
                </button>
                <button 
                  onClick={() => handleModeSwitch(true)} 
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 ${isAdvancedMode ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:text-white'}`}
                >
                  + VLANs
                </button>
              </div>
            </div>

            <div className="flex space-x-2 mb-2">
              <input type="text" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()} placeholder="Dept Name" className={`bg-slate-950/80 border border-slate-700 hover:border-slate-500 rounded-2xl px-4 py-3.5 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-inner ${isAdvancedMode ? 'w-[35%]' : 'w-[45%]'}`} />
              
              <input 
                type={ipVersion === 'v6' ? 'text' : 'number'} 
                value={ipVersion === 'v6' ? '' : newDeptHosts} 
                onChange={(e) => setNewDeptHosts(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()} 
                placeholder={ipVersion === 'v6' ? 'Auto (/64)' : 'Hosts'} 
                disabled={ipVersion === 'v6'}
                className={`bg-slate-950/80 border border-slate-700 rounded-2xl px-4 py-3.5 text-white text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-inner ${isAdvancedMode ? 'w-[25%]' : 'w-[35%]'} ${ipVersion === 'v6' ? 'opacity-50 cursor-not-allowed bg-slate-900' : 'hover:border-slate-500'}`} 
              />
              
              {isAdvancedMode && (
                <input type="number" value={newDeptVlan} onChange={(e) => setNewDeptVlan(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddDepartment()} placeholder="VLAN" className="w-[20%] bg-slate-950/80 border border-emerald-900/50 rounded-2xl px-2 py-3.5 text-emerald-300 font-mono text-center focus:outline-none focus:ring-2 focus:ring-emerald-500/50 animate-fade-in-up shadow-inner" />
              )}
              
              <button onClick={handleAddDepartment} title="Press Enter to Add" className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl flex justify-center items-center active:scale-90 transition-all shadow-lg hover:shadow-emerald-500/30 relative group">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
              </button>
            </div>
            
            <div className="flex justify-between items-center mt-3 mb-1 px-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Networks Added</span>
              {departments.length > 0 && (
                <button onClick={handleClearAll} className="text-xs font-bold text-slate-500 hover:text-red-400 transition-colors">Clear List ✖</button>
              )}
            </div>

            <div className="flex-grow space-y-2.5 overflow-y-auto pr-2 custom-scrollbar">
               {departments.length === 0 && (
                 <div className="flex flex-col items-center justify-center h-full text-slate-500/50 border-2 border-dashed border-slate-700/50 rounded-2xl">
                   <p className="text-sm font-medium">List is empty</p>
                 </div>
               )}
               {departments.map((dept, index) => (
                 <div key={index} className="group flex justify-between items-center bg-slate-950/80 px-5 py-3 rounded-xl border border-slate-800 hover:border-slate-600 transition-all">
                   <div className="flex items-center space-x-3">
                     <span className="font-semibold text-slate-200 flex items-center"><div className="w-2 h-2 rounded-full bg-emerald-500 mr-3 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>{dept.name}</span>
                     {isAdvancedMode && dept.vlan && <span className="text-xs font-mono text-emerald-400 bg-emerald-900/20 px-2 py-1 rounded border border-emerald-800/50">VLAN {dept.vlan}</span>}
                   </div>
                   <div className="flex items-center space-x-4">
                     <span className="text-emerald-300 bg-emerald-900/30 px-3 py-1 rounded-lg text-sm font-mono">{ipVersion === 'v6' ? '/64' : `${dept.hosts} hosts`}</span>
                     <button onClick={() => handleRemoveDepartment(index)} className="text-slate-600 hover:text-red-400 transition-transform hover:scale-110">✖</button>
                   </div>
                 </div>
               ))}
            </div>

            <div className="pt-4 mt-auto">
              <button 
                onClick={handleGenerate} 
                disabled={departments.length === 0} 
                className={`w-full font-extrabold tracking-wide py-4 rounded-2xl transition-all duration-300 shadow-xl border border-transparent ${
                  departments.length === 0 
                    ? 'bg-slate-800 text-slate-500 opacity-50 cursor-not-allowed' 
                    : !isCalculated 
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse hover:border-emerald-400' 
                      : 'bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white active:scale-95 shadow-emerald-500/20'
                }`}
              >
                GENERATE ARCHITECTURE
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="lg:col-span-2 bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl border border-slate-700/50 shadow-2xl flex flex-col min-h-[500px] print:bg-white print:border-none print:shadow-none print:p-0 print:block">
           {!isCalculated ? (
             <div className="flex-1 flex flex-col items-center justify-center opacity-40 print:hidden w-full h-full">
                <div className="w-full max-w-lg border-2 border-dashed border-slate-600 rounded-3xl p-8 bg-slate-800/20">
                  <div className="h-8 bg-slate-700/50 rounded w-1/3 mb-8 animate-pulse"></div>
                  <div className="space-y-4">
                    <div className="h-4 bg-slate-700/30 rounded w-full"></div>
                    <div className="h-4 bg-slate-700/30 rounded w-5/6"></div>
                    <div className="h-4 bg-slate-700/30 rounded w-full"></div>
                    <div className="h-4 bg-slate-700/30 rounded w-4/6"></div>
                  </div>
                  <div className="mt-8 flex justify-center">
                    <p className="text-slate-400 font-semibold tracking-wide bg-slate-900 px-4 py-1 rounded-full">Awaiting Network Generation...</p>
                  </div>
                </div>
             </div>
           ) : (
             <div className="flex-1 animate-fade-in-up">
                <div className="hidden print:block mb-8 border-b-2 border-black pb-4">
                  <h1 className="text-4xl font-black text-black">Network Architecture Report</h1>
                  <p className="text-gray-600 mt-2 font-mono">Generated by NetFlow App</p>
                </div>

                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 print:mb-4 gap-4">
                   <div>
                     <h3 className="text-3xl font-extrabold text-white mb-1 print:text-black">Routing Table</h3>
                     <p className="text-emerald-400 font-mono text-sm print:text-gray-800 print:text-lg print:font-bold">{majorNetwork} / {cidr}</p>
                   </div>
                   
                   <div className="flex flex-wrap gap-3 print:hidden">
                     {isAdvancedMode && ipVersion === 'v4' && (
                       <div className="flex bg-slate-800 p-1 rounded-xl border border-emerald-500/30 shadow-lg shadow-emerald-500/10">
                          <select value={ciscoDeviceType} onChange={(e) => setCiscoDeviceType(e.target.value)} className="bg-transparent text-emerald-300 text-xs font-bold px-2 py-2 outline-none cursor-pointer">
                            <option value="l3switch">L3 Switch (SVI)</option>
                            <option value="router">Router (Sub-Int)</option>
                          </select>
                          <button onClick={downloadCiscoConfig} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-4 py-2 rounded-lg transition-all active:scale-95 font-bold flex items-center">
                            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg> CISCO IOS
                          </button>
                       </div>
                     )}
                     
                     <button onClick={downloadJSON} className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs px-4 py-3 rounded-xl border border-slate-600 flex items-center transition-all active:scale-95 font-bold">
                        JSON
                     </button>
                     <button onClick={downloadPDF} className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-5 py-3 rounded-xl border border-emerald-500 flex items-center transition-all active:scale-95 font-bold shadow-lg shadow-emerald-500/20">
                       EXPORT PDF
                     </button>
                   </div>
                </div>
                
                {ipVersion === 'v4' && (
                  <div className="mb-8 p-6 bg-slate-950/80 rounded-2xl border border-slate-800 print:border-gray-300 print:bg-white print:p-0 print:mb-6 shadow-inner">
                    <div className="flex justify-between text-sm text-slate-400 font-mono mb-3 print:text-black">
                      <span className="text-white font-bold print:text-black">{calculationResults.usedCapacity} IPs Allocated</span>
                      <span>Total Capacity: {calculationResults.totalNetworkCapacity}</span>
                    </div>
                    <div className="w-full bg-slate-900 rounded-full h-3 mb-1 overflow-hidden print:bg-gray-200 border border-slate-800">
                      <div className={`h-full rounded-full print:bg-black ${calculationResults.usedCapacity > calculationResults.totalNetworkCapacity ? 'bg-red-500' : 'bg-gradient-to-r from-emerald-500 to-teal-400'}`} style={{ width: `${Math.min((calculationResults.usedCapacity / calculationResults.totalNetworkCapacity) * 100, 100)}%` }}></div>
                    </div>
                    {calculationResults.usedCapacity > calculationResults.totalNetworkCapacity && (
                      <p className="text-red-400 text-sm mt-3 font-bold animate-pulse">⚠️ Warning: Department requirements exceed available network capacity!</p>
                    )}
                  </div>
                )}

                <div className="overflow-y-auto max-h-[550px] border border-slate-700/50 rounded-2xl shadow-xl print:border-black print:rounded-none print:shadow-none print:max-h-none custom-scrollbar bg-slate-900/20">
                  <table className="w-full text-left text-sm text-slate-300 print:text-black relative">
                    <thead className="sticky top-0 z-10 bg-slate-950/95 backdrop-blur-sm text-slate-400 uppercase font-bold text-xs tracking-widest border-b border-slate-700/50 print:static print:bg-gray-100 print:text-black print:border-black">
                      <tr>
                        <th className="px-6 py-5 border-b print:border-black">Department</th>
                        {isAdvancedMode && <th className="px-6 py-5 border-b print:border-black text-emerald-400">VLAN</th>}
                        <th className="px-6 py-5 border-b print:border-black">Subnet</th>
                        <th className="px-6 py-5 border-b print:border-black">Network</th>
                        <th className="px-6 py-5 border-b print:border-black hidden md:table-cell">Usable Range</th>
                        <th className="px-6 py-5 border-b print:border-black">Broadcast</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/80 print:divide-gray-300 print:bg-white">
                      {calculationResults.results.map((res, idx) => (
                        <tr key={idx} className={`transition-colors duration-200 ${res.isOverflow ? 'bg-red-950/40 border-l-4 border-red-500' : 'hover:bg-slate-800/50'}`}>
                          <td className={`px-6 py-4 font-bold flex items-center ${res.isOverflow ? 'text-red-400' : 'text-white print:text-black'}`}>
                            <span className={`w-2.5 h-2.5 rounded-full mr-3 print:hidden ${res.isOverflow ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]'}`}></span>{res.name}
                          </td>
                          {isAdvancedMode && (
                            <td className={`px-6 py-4 font-mono font-bold ${res.isOverflow ? 'text-red-400/50' : 'text-emerald-400 print:text-black'}`}>
                              {res.vlan || '-'}
                            </td>
                          )}
                          <td className={`px-6 py-4 font-mono font-bold ${res.isOverflow ? 'text-red-400' : 'text-emerald-400 print:text-black'}`}>/{res.cidr}</td>
                          <td onClick={() => handleCopy(res.networkAddress)} className={`px-6 py-4 font-mono relative cursor-pointer group ${res.isOverflow ? 'text-red-400 font-bold' : 'text-slate-200 hover:text-emerald-300 print:text-black'}`}>
                            {res.networkAddress}
                            {copiedText === res.networkAddress && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-600 text-white text-xs px-2 py-1 rounded shadow-lg">Copied!</span>}
                          </td>
                          <td onClick={() => handleCopy(res.usableRange)} className={`px-6 py-4 font-mono hidden md:table-cell relative cursor-pointer group ${res.isOverflow ? 'text-red-400/80 font-bold' : 'text-slate-500 hover:text-emerald-300 print:text-black'}`}>
                            {res.usableRange}
                            {copiedText === res.usableRange && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-600 text-white text-xs px-2 py-1 rounded shadow-lg">Copied!</span>}
                          </td>
                          <td onClick={() => handleCopy(res.broadcastAddress)} className={`px-6 py-4 font-mono relative cursor-pointer group ${res.isOverflow ? 'text-red-400/80' : 'text-slate-400 hover:text-emerald-300 print:text-black'}`}>
                            {res.broadcastAddress}
                            {copiedText === res.broadcastAddress && <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-emerald-600 text-white text-xs px-2 py-1 rounded shadow-lg">Copied!</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  )
}

export default App