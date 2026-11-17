#include <cmath>
#include <iostream>
#include "../Stormer123EARules.mqh"
int failures=0,checks=0;
void check(bool v,const char *n) {++checks;if(!v){++failures;std::cerr<<"FAIL: "<<n<<"\n";}}
bool near(double a,double b){return std::abs(a-b)<1e-8;}
int main(){
 Plan123 buy={1,100,90,116.1,110},sell={-1,100,110,83.9,90};
 check(Trigger123(buy,98,99,1,1,1,0)==0,"compra aguarda ask no gatilho");
 check(Trigger123(buy,99,100,1,1,1,0)==1,"compra dispara pelo ask");
 check(Trigger123(sell,100,101,1,1,1,0)==1,"venda dispara pelo bid");
 check(Trigger123(sell,101,102,1,1,1,0)==0,"venda aguarda perda do gatilho");
 check(Trigger123(buy,90,101,1,1,1,0)==2,"stop e gatilho simultaneos invalidam antes da compra");
 check(Trigger123(sell,99,110,1,1,1,0)==2,"stop e gatilho simultaneos invalidam antes da venda");
 check(Trigger123(buy,99,100,2,1,1,0)==3,"sinal expirado nunca entra");
 check(Trigger123(buy,99,100,-1,1,1,0)==3,"candle ausente invalida pendente");
 check(Trigger123(buy,99,100,0,1,1,0)==3,"C3 em formacao nao pode entrar");
 check(Trigger123(buy,117,118,1,1,1,0)==4,"gap acima do alvo nao persegue compra");
 check(Trigger123(sell,82,83,1,1,1,0)==4,"gap abaixo do alvo nao persegue venda");
 check(Trigger123(buy,99,101,1,1,1,1)==5,"spread excessivo bloqueia tick");
 check(Trigger123(buy,99,100,1,1,1,1)==1,"spread no limite permite entrada");
 check(Trigger123(buy,99,101,1,1,1,0)==1,"filtro de spread pode ser desligado");
 check(near(Volume123(1.9,1,100,1),1),"contratos arredondam para baixo");
 check(near(Volume123(0.137,0.01,10,0.01),0.13),"lotes respeitam passo sem aumentar risco");
 check(near(Volume123(0.3,0.1,10,0.1),0.3),"passos decimais nao perdem lote por ponto flutuante");
 check(Volume123(0.5,1,100,1)==0,"nao aumenta volume ate minimo");
 check(Volume123(101,1,100,1)==0,"volume maior que maximo rejeitado");
 check(Volume123(1,1,100,0)==0,"passo invalido rejeitado");
 check(MarketStops123(buy,99,100,5),"stops compradores validos");
 check(!MarketStops123(buy,94,100,5),"stop comprador perto demais rejeitado");
 check(!MarketStops123(buy,112,113,5),"alvo comprador perto demais rejeitado");
 check(MarketStops123(sell,100,101,5),"stops vendedores validos");
 check(!MarketStops123(sell,100,106,5),"stop vendedor perto demais rejeitado");
 check(!MarketStops123(sell,87,88,5),"alvo vendedor perto demais rejeitado");
 check(!OfferAfterExit123(true,false,0,1000),"posicao ativa bloqueia padrao");
 check(!OfferAfterExit123(false,true,0,1000),"ordem em processamento bloqueia padrao");
 check(!OfferAfterExit123(false,false,1000,1000),"saida no novo candle nao ressuscita C3 anterior");
 check(OfferAfterExit123(false,false,999,1000),"saida antes do fechamento libera novo C3");
 check(OfferAfterExit123(false,false,0,1000),"sem operacao anterior pode formar sinal");
 check(Trigger123(buy,100,99,1,1,1,0)==6,"cotacao invertida nao gera ordem");
 check(Trigger123(buy,0,100,1,1,1,0)==6,"cotacao zerada nao gera ordem");
 check(Trigger123(buy,99,100,1,1,0,0)==6,"tick invalido nao gera ordem");
 check(Volume123(1,0,100,1)==0,"minimo invalido rejeitado");
 check(Volume123(1,2,1,1)==0,"faixa de volume invertida rejeitada");
 check(Volume123(0.15,0.15,100,0.1)==0,"arredondamento abaixo do minimo rejeitado");
 check(!MarketStops123(buy,89,100,0),"stop do lado errado na compra rejeitado");
 check(!MarketStops123(buy,115,117,0),"compra acima do alvo rejeitada");
 check(!MarketStops123(sell,100,111,0),"stop do lado errado na venda rejeitado");
 check(!MarketStops123(sell,83,84,0),"venda abaixo do alvo rejeitada");
 Protection123 beBuy={1,100,10,100},beSell={-1,100,10,100};
 check(near(ProtectStop123(beBuy,0,90,116,115,116,1,1,1,0.75,0,0),90),"referencia nunca altera stop");
 check(near(ProtectStop123(beBuy,1,90,116,109,111,1,1,1,0.75,0,0),90),"BE comprador espera bid atingir 1R, nao ask");
 check(near(ProtectStop123(beBuy,1,90,116,110,111,1,1,1,0.75,0,0),101),"BE comprador em 1R protege entrada mais um tick");
 check(near(ProtectStop123(beBuy,1,101,116,108,109,1,1,1,0.75,0,0),101),"recuo nao desfaz breakeven");
 check(near(ProtectStop123(beSell,1,110,84,89,91,1,1,1,0.75,0,0),110),"BE vendedor espera ask atingir 1R");
 check(near(ProtectStop123(beSell,1,110,84,89,90,1,1,1,0.75,0,0),99),"BE vendedor protege entrada menos um tick");
 Protection123 trailBuy={1,100,10,100},trailSell={-1,100,10,100};
 check(near(ProtectStop123(trailBuy,2,90,120,109,110,0.5,1,1,0.75,0,0),90),"trailing nao inicia antes de 1R");
 check(near(ProtectStop123(trailBuy,2,90,120,110,111,0.5,1,1,0.75,0,0),102.5),"trailing comprador distancia 0.75R do melhor bid");
 check(near(ProtectStop123(trailBuy,2,102.5,120,112,113,0.5,1,1,0.75,0,0),104.5),"trailing acompanha nova maxima favoravel");
 check(near(ProtectStop123(trailBuy,2,104.5,120,111,112,0.5,1,1,0.75,0,0),104.5),"trailing nunca devolve protecao no recuo");
 check(near(trailBuy.risk,10),"R permanece original depois de mover stop");
 check(near(ProtectStop123(trailSell,2,110,80,89,90,0.5,1,1,0.75,0,0),97.5),"trailing vendedor distancia 0.75R do melhor ask");
 check(near(ProtectStop123(trailSell,2,97.5,80,87,88,0.5,1,1,0.75,0,0),95.5),"trailing acompanha minima vendedora");
 check(near(ProtectStop123(trailSell,2,95.5,80,88,89,0.5,1,1,0.75,0,0),95.5),"trailing vendedor nunca amplia stop");
 Protection123 roundBuy={1,100,10,110},roundSell={-1,100,10,90};
 check(near(ProtectStop123(roundBuy,2,90,120,110,111,1,1,1,0.75,0,0),102),"arredonda stop comprador para baixo no tick");
 check(near(ProtectStop123(roundSell,2,110,80,89,90,1,1,1,0.75,0,0),98),"arredonda stop vendedor para cima no tick");
 check(near(ProtectStop123(roundBuy,2,105,120,110,111,1,1,1,0.75,0,0),105),"nao piora stop ja mais protegido");
 Protection123 denied={1,100,10,100};
 check(near(ProtectStop123(denied,1,90,130,110,111,1,1,1,0.75,10,0),90),"distancia minima do broker adia modificacao");
 check(near(denied.best,110),"mantem maxima favoravel mesmo se stop nao puder mudar");
 check(near(ProtectStop123(denied,1,90,130,112,113,1,1,1,0.75,10,0),101),"aplica protecao quando distancia passa a permitir");
 check(near(ProtectStop123(denied,1,101,130,110,111,1,1,1,0.75,0,0),101),"nao reenvia stop sem melhora de um tick");
 Protection123 frozen={1,100,10,110};
 check(near(ProtectStop123(frozen,1,90,130,110,111,1,1,1,0.75,0,10),90),"stop proposto dentro do freeze nao enviado");
 check(near(ProtectStop123(frozen,1,90,111,110,111,1,1,1,0.75,0,2),90),"TP congelado nao e alterado nem reenviado");
 check(near(ProtectStop123(frozen,1,90,130,110,111,1,1,1,0.75,0,20),90),"stop atual congelado impede modificacao");
 Protection123 frozenSell={-1,100,10,90};
 check(near(ProtectStop123(frozenSell,1,110,80,89,90,1,1,1,0.75,10,0),110),"distancia minima vendedora respeitada");
 check(near(ProtectStop123(frozenSell,1,110,89,89,90,1,1,1,0.75,0,2),110),"TP vendedor congelado impede modificacao");
 Protection123 gap={1,100,10,110};
 check(near(ProtectStop123(gap,1,90,130,100,101,1,1,1,0.75,0,0),90),"BE pendente nao vira stop acima do mercado apos gap");
 Protection123 noRisk={1,100,0,100};
 check(near(ProtectStop123(noRisk,1,90,120,110,111,1,1,1,0.75,0,0),90),"risco inicial invalido nao move stop");
 check(near(ProtectStop123(gap,1,90,130,110,109,1,1,1,0.75,0,0),90),"quote invertido nao move stop");
 check(near(ProtectStop123(gap,1,90,130,110,111,0,1,1,0.75,0,0),90),"tick invalido nao move stop");
 check(near(ProtectStop123(gap,3,90,130,110,111,1,1,1,0.75,0,0),90),"modo desconhecido nao move stop");
 Protection123 zeroOffset={1,100,10,100};
 check(near(ProtectStop123(zeroOffset,1,90,120,110,111,1,1,0,0.75,0,0),100),"offset zero permite BE no preco de entrada");
 Protection123 secondTrade={1,200,20,200};
 check(near(ProtectStop123(secondTrade,2,180,240,215,216,1,1,1,0.75,0,0),180),"nova operacao usa seu proprio R e nao herda ativacao");
 std::cout<<checks<<" EA checks, "<<failures<<" failures\n";return failures?1:0;
}


