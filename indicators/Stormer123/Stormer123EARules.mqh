#ifndef STORMER_EA_RULES
#define STORMER_EA_RULES
#include "Stormer123Core.mqh"
#ifdef __cplusplus
#define MathFloor std::floor
#define MathCeil std::ceil
#endif
// 0 wait, 1 enter, 2 invalid stop, 3 expired, 4 gap beyond target,
// 5 spread blocked, 6 unusable quote (wait for a valid tick).
int Trigger123(const Plan123 &plan,double bid,double ask,int age,int validity,double tick,double maxSpread) {
 if(age<1 || age>validity) return 3;
 if(tick<=0 || bid<=0 || ask<bid) return 6;
 if(plan.side==1?bid<=plan.stop:ask>=plan.stop) return 2;
 if(plan.side==1?ask>=plan.target:bid<=plan.target) return 4;
 if(maxSpread>0 && ask-bid>maxSpread*tick+tick*1e-8) return 5;
 return (plan.side==1?ask>=plan.entry:bid<=plan.entry)?1:0;
}
double Volume123(double requested,double minimum,double maximum,double step) {
 if(step<=0 || minimum<=0 || maximum<minimum || requested<minimum || requested>maximum) return 0;
 double volume=MathFloor(requested/step+1e-8)*step;
 return volume+step*1e-8>=minimum?volume:0;
}
bool MarketStops123(const Plan123 &plan,double bid,double ask,double minimumDistance) {
 if(plan.side==1) return plan.stop<bid && plan.target>ask && bid-plan.stop>=minimumDistance && plan.target-bid>=minimumDistance;
 return plan.stop>ask && plan.target<bid && plan.stop-ask>=minimumDistance && ask-plan.target>=minimumDistance;
}
bool OfferAfterExit123(bool position,bool workingOrder,long exitTime,long barOpen) {
 return !position && !workingOrder && exitTime<barOpen;
}
// Initial risk is frozen from the executed entry and original SL, never the moved SL.
struct Protection123 { int side; double entry,risk,best; };
double ProtectStop123(Protection123 &state,int mode,double currentSL,double tp,double bid,double ask,double tick,double activationR,int offsetTicks,double distanceR,double stopsLevel,double freezeLevel) {
 if(mode<1 || mode>2 || state.risk<=0 || tick<=0 || bid<=0 || ask<bid) return currentSL;
 double closePrice=state.side==1?bid:ask;
 state.best=state.side==1?Max123(state.best,closePrice):Min123(state.best,closePrice);
 double epsilon=tick*1e-8;
 if(state.side*(state.best-state.entry)+epsilon<activationR*state.risk) return currentSL;
 double proposed=mode==1?state.entry+state.side*offsetTicks*tick:state.best-state.side*distanceR*state.risk;
 // Round away from the market; never tighten more than the chosen distance.
 proposed=(state.side==1?MathFloor(proposed/tick+1e-8):MathCeil(proposed/tick-1e-8))*tick;
 if(state.side*(proposed-currentSL)+epsilon<tick) return currentSL;
 double distance=state.side*(closePrice-proposed);
 if(distance<=0 || distance+epsilon<stopsLevel || distance<=freezeLevel+epsilon) return currentSL;
 if(freezeLevel>0 && (MathAbs(closePrice-currentSL)<=freezeLevel+epsilon || (tp>0 && MathAbs(closePrice-tp)<=freezeLevel+epsilon))) return currentSL;
 return proposed;
}
#endif
