#ifndef STORMER_CORE
#define STORMER_CORE
#ifdef __cplusplus
#include <cmath>
#include <string>
using std::string;
#define MathRound std::round
#define MathAbs std::abs
#endif
struct Bar123 { double high,low; };
struct Plan123 { int side; double entry,stop,target,partial; };
double Max123(double a,double b) { return a>b?a:b; }
double Min123(double a,double b) { return a<b?a:b; }
int Pattern123(const Bar123 &a,const Bar123 &b,const Bar123 &c) {
 bool buy=b.low<a.low && b.low<c.low;
 bool sell=b.high>a.high && b.high>c.high;
 if(buy==sell) return 0;
 return buy?1:-1;
}
bool Trend123(int side,double fast,double fastOld,double slow,double slowOld) {
 return side*(fast-slow)>0 && side*(fast-fastOld)>0 && side*(slow-slowOld)>0;
}
Plan123 Levels123(int side,const Bar123 &a,const Bar123 &b,const Bar123 &c,double tick,int stopMode,int targetMode,double factor,int buffer) {
 Plan123 p;
 p.side=side;
 p.entry=MathRound((side==1?c.high:c.low)/tick)*tick+side*buffer*tick;
 double stop=side==1?(stopMode==0?b.low:c.low):(stopMode==0?b.high:c.high);
 p.stop=MathRound(stop/tick)*tick-side*buffer*tick;
 double risk=MathAbs(p.entry-p.stop);
 double amplitude=Max123(a.high,Max123(b.high,c.high))-Min123(a.low,Min123(b.low,c.low));
 double distance=targetMode==0?risk:amplitude;
 p.target=MathRound((p.entry+side*factor*distance)/tick)*tick;
 p.partial=MathRound((p.entry+side*risk)/tick)*tick;
 return p;
}
// OHLC cannot establish the order of touches inside the same candle.
// 0 waiting, 1 active, 2 stop, 3 target, 4 expired, 5 invalid, 6 ambiguous.
int Step123(int state,const Plan123 &p,double high,double low,bool expired) {
 if(state>=2) return state;
 bool entry=p.side==1?high>=p.entry:low<=p.entry;
 bool stop=p.side==1?low<=p.stop:high>=p.stop;
 bool target=p.side==1?high>=p.target:low<=p.target;
 if(state==0) {
  if(expired) return 4;
  if(entry && (stop || target)) return 6;
  if(stop) return 5;
  return entry?1:0;
 }
 if(stop && target) return 6;
 if(stop) return 2;
 if(target) return 3;
 return 1;
}
// View and historical outcomes shared by the renderer and its behavioral tests.
struct Trace123 { int state,entryAge,exitAge; };
void Advance123(Trace123 &trace,const Plan123 &p,double high,double low,int age,int validity) {
 if(trace.state>=2) return;
 trace.state=Step123(trace.state,p,high,low,age>validity);
 if(trace.state==1 && trace.entryAge<0) trace.entryAge=age;
 if(trace.state>=2) trace.exitAge=age;
}
string Outcome123(int state) {
 switch(state) {
  case 0:return "AGUARDANDO";
  case 1:return "EM ANDAMENTO";
  case 2:return "LOSS";
  case 3:return "GAIN";
  case 4:return "EXPIRADO";
  case 5:return "SEM ENTRADA";
  case 7:return "SUBSTITUIDO";
  default:return "INCERTO";
 }
}
double Return123(int state,const Plan123 &p) {
 if(state==2) return -1;
 if(state==3) return MathAbs(p.target-p.entry)/MathAbs(p.entry-p.stop);
 return 0;
}
int Toggle123(int mask,int flag) {
 if(flag!=1 && flag!=2 && flag!=4 && flag!=8 && flag!=16 && flag!=32) return mask;
 return mask^flag;
}
bool Visible123(int rank,int mask) { return (mask & (rank==0?2:1))!=0; }
// Chronological single-operation engine. One offer per CLOSED bar, after its prices.
struct Sequence123 { bool hasSignal; int formed; Plan123 plan; Trace123 trace; };
struct SequenceEvent123 { bool accepted,updated; Trace123 previous; };
SequenceEvent123 Process123(Sequence123 &seq,const Bar123 &bar,int index,int validity,bool closed,bool hasCandidate,const Plan123 &candidate) {
 SequenceEvent123 event={false,false,{0,-1,-1}};
 if(seq.hasSignal) {
  if(index>seq.formed) Advance123(seq.trace,seq.plan,bar.high,bar.low,index-seq.formed,validity);
  event.updated=true;
  event.previous=seq.trace;
 }
 // No offer on C0; do not queue offers rejected during an active operation.
 if(!closed || !hasCandidate) return event;
 if(seq.hasSignal && seq.trace.state==1) return event;
 // An uncertain exit cannot establish that another trade could start this bar.
 if(seq.hasSignal && seq.trace.state==6 && seq.formed+seq.trace.exitAge==index) return event;
 if(seq.hasSignal && seq.trace.state==0) {
  event.previous.state=7; // Superseded pending signal, never a loss.
  event.previous.exitAge=index-seq.formed;
 }
 seq.hasSignal=true;
 seq.formed=index;
 seq.plan=candidate;
 seq.trace.state=0; seq.trace.entryAge=-1; seq.trace.exitAge=-1;
 event.accepted=true;
 return event;
}
#endif



