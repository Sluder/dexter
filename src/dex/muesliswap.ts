import { BaseDex } from './base-dex';
import {
    AssetAddress,
    AssetBalance,
    DatumParameters,
    DefinitionConstr,
    DefinitionField,
    PayToAddress,
    RequestConfig, SpendUTxO,
    SwapFee,
    UTxO
} from '@app/types';
import { Asset, Token } from './models/asset';
import { LiquidityPool } from './models/liquidity-pool';
import { BaseDataProvider } from '@providers/data/base-data-provider';
import { DefinitionBuilder } from '@app/definition-builder';
import { correspondingReserves, tokensMatch } from '@app/utils';
import { AddressType, DatumParameterKey } from '@app/constants';
import pool from '@dex/definitions/muesliswap/pool';
import order from '@dex/definitions/muesliswap/order';
import { BaseApi } from '@dex/api/base-api';
import { MuesliSwapApi } from '@dex/api/muesliswap-api';
import { Script } from 'lucid-cardano';

export class MuesliSwap extends BaseDex {

    public static readonly identifier: string = 'MuesliSwap';
    public readonly api: BaseApi;

    /**
     * On-Chain constants.
     */
    public readonly orderAddress: string = 'addr1zyq0kyrml023kwjk8zr86d5gaxrt5w8lxnah8r6m6s4jp4g3r6dxnzml343sx8jweqn4vn3fz2kj8kgu9czghx0jrsyqqktyhv';
    public readonly lpTokenPolicyId: string = 'af3d70acf4bd5b3abb319a7d75c89fb3e56eafcdd46b2e9b57a2557f';
    public readonly poolNftPolicyIdV1: string = '909133088303c49f3a30f1cc8ed553a73857a29779f6c6561cd8093f';
    public readonly poolNftPolicyIdV2: string = '7a8041a0693e6605d010d5185b034d55c79eaf7ef878aae3bdcdbf67';
    public readonly factoryToken: string = 'de9b756719341e79785aa13c164e7fe68c189ed04d61c9876b2fe53f4d7565736c69537761705f414d4d';
    public readonly cancelDatum: string = 'd87980';
    public readonly orderScript: Script = {
        type: 'PlutusV2',
        script: '59152a010000323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323232323223232323232322232323232323232323232533355333573460d000226464646424446600200a0086eb4d5d09aba2003355333573460d060da0022660a06eb4d5d098360009bad357426ae88c1b000458c1b88894ccd5cd18358008b0a999ab9a337100029000099801983500118350008991982a19b8400300133708004002660ce0040026ea8d5d080098350010a999ab9a306700113212223002004375a6ae84c1a800854ccd5cd18330008220b099180e1a9a805030911111111111299a999aa983583601892999ab9a3371e01c002260c80020c400840d20c2a020426038660946010002660946603a666aa60b40c06a0340c26a0340c4666aa60b40c044a66a6a0044444a66a6605060a4030008260ba0060b642660c200200420020ba60546a0140c2660366660486a01e0c26a01e0c460460246660486a01e0c26a01e0c466604c6a0120886a01e0c26a01e0c4660946008a0226020a00a4426464646464646046660a2601e00e660a2603e032660a2602ea018660a26016a030660a26a01044666ae68cdc499b8200248008cdc1240000020be0cc660a26a0104426ae68cdc419b8200248008cdc1011000998289982899814982980c98298029982899827981d00c981d0029982899827981700c98170029982899827980e00c980e0029982899827980e80c980e802a99a980f80c88020a99a80202e031998289a9980f1a804111919191982d99b8400300133708004002660dc00400266e0808c008cdc099b8202200133704004044660ac60540329001112999ab9a3370e00a0042660760440020bc66048660446a00c0d26660560040026a6a6603c010660ac66605a6a0200960040029001111982c19b84002001330583370a0040020020d0660446a0200966660566a02c0d06a02c0d26a6603c660ac6054032900100438435014068350130663027002301b00135001063533553353500b22350022222222222223333500d206620662066233355306f070035235001225335330470020041306a00306800d2135001223500122223501222350022222222222223335530700762235002222253353303e01800413307a006005100507300a16162215335001133052300a00235002204a2216306a00137540144666aa60b80ba604a04c400266aa60b00ba46a00244446a0084466a0044a666ae68cdc78048008a999a80282d102d90a99a9981a0009a80803390a99a9999999aba40012325333573460e060ea0022646666aae7c00481848cccd55cf9aba2002253353039357420064260c82460020040c240c40d60d460e80020bc6ea8008817881788178817819c84cc140d4004800522010f4d7565736c69537761705f76322e320005c05b061206230273500705e13306822533500105922132533553353035303735003062215335007213304a00200105615335006205605c15335333049034350030613500922200113305e30073500306200110011001300400130313500505c30513500304025333535001203f16216215335330290013500505c21533533333335748002464a666ae68c194c1a80044c8cccd55cf800902b11999aab9f35744004464a66a6666666ae900048c94ccd5cd183598380008991999aab9f001205c23233335573e00240bc4646666aae7c00481808c8cccd55cf80090311191999aab9f001206423233335573e00240cc4646666aae7c00481a08c8cccd55cf800903511999aab9f35744004464a66aa66aa66aa66aa66aa66aa66aa66a6666666ae900048c94ccd5cd183f9842008008991999aab9f001207023233335573e00240e446666aae7cd5d10011299a98241aba1005213253353333333574800246464a666ae68c224040044cccd55cf984680801103c91999aab9f35744611c02006464a66a6666666ae900048c8c94ccd5cd18480080089999aab9f309301002207f23233335573e0024102024646666aae7c004820c048cccd55cf9aba200225335305a3574261320201042a66a60b66ae84018854cd4c170d5d0802909844009998410080180100084280842008418090420084680846009aba200208a0135744612802006110022a666ae68c23c040044cccd55cf984980801103f91999aab9f357446128020064a66a60aa6ae84c2540401084c20804c208040041fc82000422404220041f4c24c04004dd5001103e103e103e103e0428090983e983e80083d1aba1308f01004207a083010820115333573461140200226666aae7cc234040088c1e81e481e4208041dcc23404004dd5001103b103b103b103b03f90983b9983780180083a1aba1004072207307c07b357440040f26106020020da6ea800881b481b481b481b41d884c1b8c1bc0041ac854cd4c110d5d0808909837980100083603590a99a98221aba100f21306f300200106c06b21533530443574201a4260de60040020d80d642a66a60886ae8402c84c1bcc0080041b01ac854cd4c10cd5d080490983798010008360359099299a9999999aba4001232325333573461060200226666aae7cc218040088c1cc1e481c81ec54ccd5cd18410080089999aab9f30860100223073072207207b070308601001375400440de40de40de40de0f04260e060060020da6ae8401c1ac854cd4c10cd5d080290983798010008360359aba1011206b074073357440040e26ae880081bcd5d10010369aba200206b357440040d26ae8800819cd5d1001032983780082c9baa002205920592059205906221305a305c0010573574200640ae0c00be60d20020a66ea8008814c814c814c814c17084d4004800458588c8d4d4d401016c888818888d40048c894ccd54ccd4018854ccd4010854ccd402084c0140c44c0100c054ccd401484c0140c44c0100c011810c54ccd401c84c0100c04c00c0bc54ccd401084c0100c04c00c0bc11454ccd400c810811010454ccd400c854ccd401c84c0100c04c00c0bc54ccd401084c0100c04c00c0bc11410854ccd401884c00c0bc4c0080b854ccd400c84c00c0bc4c0080b811054cd400415016c16c15094ccd4008854ccd4018854ccd401084ccc0d00c400800458585810854ccd4014854ccd400c84ccc0cc0c0008004585858104100c100ccc198888c94ccd5cd19b87003371a002200426600866e0000d20023370066e080092080043371c002006a66a660d244a66a0020a64426a00444a666ae68cdc78012451c5817c34e5702473304f3cf676299176d3824e55b8c0bfa94830429fd001305900113006003353533533069221225333573466e2000520001615335002162215333573460d20062004266a600c0c400266e0400d200205c30323500605d00405e204321533500116221350022253350031002221616480012000350012233335001262626232533530303032001213212333001003002005350022043163330672225335002162213500222533533035002005100113300700300530303500405b0015333573460ba60c400226464642466002006004606c6ae84d5d11831801a999ab9a305e3063001132323232323232323232323232323232323232323232321233333333333300101801601401201000e00c009007005003002304e357426ae88008ccc121d710009aba10013574400466608c09040026ae84004d5d100119822bae357420026ae8800d4ccd5cd1836983900089919191909198008020012999ab9a307030750011330583304175a6ae84c1d0004c158d5d09aba230740011637546ae84d5d11839801a999ab9a306e30730011323212330010030023055357426ae88c1cc008cc0fdd69aba130720011637546ae84c1c400458dd51aba10013574400466607e0a6eb4d5d08009aba20023303e040357420026ae88008ccc0edd701d1aba100135744004666072eb80e0d5d08009aba200233038035357420026ae88008cc0d80c8d5d08009aba23063002330340303574260c40022c6ea8d5d098308008b1baa00133041300700430080043304030240033018003305d22533500104e2213303e33303d03c303f3040002500530040011303a303b001355333573460aa60b40022646090a666ae68c158c16c0044c8c8c8c8c8c8cccccccc134c10cd5d098300039bae3574200c6eb8d5d08029bae357420086eb8d5d08019bad3574200460846ae84004dd69aba1357440026ae88004d5d10009aba2001357440026ae88004d5d1182d0008b1baa3574260b20022c40026ea80048d40041408d4004814488d400888d400c88c8c8c8cc104cdc200100099b84003001330540010023370400a00666e0800c0048d4004888880c9200233035001043223355304204723500122330390023355304504a235001223303c0023335001370090003802337000029000000998028010009299a8008890008b11199aa9822022980680711a80091199aa9823824180800891a80091199a80091980ea400000203846603a0029000000998018010009119aa981f82211a800911981b001199a800919aa982182411a800911981d001181900080091199804018801000919aa982182411a800911981d0011806000800999801816001000911199aa981f02202119aa981f82211a800911981b0011817000999aa981f022111a80111299a999aa98238241981b91199805025801000980402511a8009119805001002803080189982300200182080099aa981f82211a800911981b0011982a11299a800898050019109a80111299a9980600100408911198010050020980300180200111980091299a80101f880081b909111800802111a801111a801911919a802919a80212999ab9a3371e004002006078407a466a008407a4a666ae68cdc780100080181e0a99a80190a99a8011099a801119a801119a801119a8011198190010009020119a801102011981900100091102011119a80210201112999ab9a3370e00c0062a666ae68cdc380280109980f00200082082081d0a99a800901d02011a800911110149111981e998170019981e9981700100081e01e1981511299a801108018800818911198251119a800a4000446a00444a666ae68cdc78010040998281119a800a4000446a00444a666ae68cdc78010068800898030018008980300180191a8009111111100311981411199a80181e0010009a80081d891980081101a91a80091111111111100511999999aba40012323253335734608200226666aae7cc11000880c08cccd55cf9aba2304500325335300835742608c008426066605e00206040620740722a666ae68c1000044cccd55cf9822001101811999aab9f35744608a0064a66a60106ae84c11801084c0ccc0cc0040c080c40e80e40b8c110004dd5001101690169016901681b11999999aba4001202c202c202c2302d375a004405806a46666666ae9000480ac80ac80ac80ac8c0b0dd700101a111a8009111111111111982691299a80081b9109a801112999ab9a3371e0040282607a0022600c006004930919999999800801912999ab9a3370e0040020302a666ae68cdc480100080a80b1109ab9a337100040024426ae68cdc480100091199ab9a3371200400205206000444a666ae68cdc480100088008801112999ab9a337120040022004200244666ae68cdc40010008138171109ab9a3370e00400246a0024444444400e44a666ae68cdc79a8010179a800817889ab9a3370e6a0040606a00206004646a0024466a004404a04a46a00244444444444401846a0024444008446464a666ae68c0d400403854ccd5cd181a0008980998021aba13037002153335734606600201e2c606e0026ea80048c94ccd5cd1818181a80089919091980080180118021aba135744606a00460126ae84c0d000458dd50009192999ab9a302f3034001132323232323232321233330010090070030023302375c6ae84d5d10022999ab9a3037001132122230020043574260720042a666ae68c0d80044c84888c004010dd71aba13039002153335734606a0020262c60720026ea8d5d08009aba200233300675c00a6ae84004d5d1181a001180b1aba1303300116375400266002eb9d69111981a111999aab9f0012027232330293301a30073037001300630360013004357440066ae840080a4dd58009119819111999aab9f001202523302630053574200460066ae8800809cdd6000919192999ab9a302f00113212222300400530043574260600042a666ae68c0b80044c848888c008014c054d5d098180010a999ab9a302d00113212222300100530053574260600042a666ae68c0b00044c848888c00c014dd71aba13030002163030001375400246464a666ae68cdc3a401800222444401c2a666ae68cdc3a4014002220522a666ae68cdc3a40100022646424444444660020120106eb4d5d09aba23030003375c6ae84c0bc00854ccd5cd18170008991909111111198010048041bae357426ae88c0c000cdd71aba1302f002153335734605a00226464244444446600c0120106eb8d5d09aba23030003301435742605e0042a666ae68c0b00044c848888888c01c020c050d5d098178010a999ab9a302b001132122222223005008301435742605e0042c605e0026ea80048c94ccd5cd181498170008991909198008018011bad357426ae88c0b8008c00cd5d098168008b1baa001232533357346050605a00226eb8d5d098160008b1baa0011122200111001222002110012220032122230030042213573466e3c0080048894cd4cc00c00800403c058894cd400840040348d400488cd40088004988d4004888888880208c94ccd5cd180e8008088a999ab9a301c00100a1630203754002464a666ae68c06cc0800044cc00cc018d5d0980f800998040021aba135744603e0022c6ea80048848cc00400c0088c8c94ccd5cd180d8008991998029bad35742603e0066eb4d5d08009bad357426ae88004d5d1180f0010a999ab9a301a0011300a300535742603c0042c603c0026ea8004888488ccc00401401000c8c8c94ccd5cd180c800898021bae3574260380042a666ae68c0600044c020dd71aba1301c00216301c001375400242446002006446464a666ae68c05c0044c01cc010d5d0980d8010a999ab9a301800100516301b0013754002200220184244600400644444444246666666600201201000e00c00a008006004424600200460264422444a66a00220044426600a004666aa600e01a00a0080026024442244a66a00200a44266012600800466aa600c016008002200220084424466002008006601c4422444a66a00226a006010442666a00a0126008004666aa600e01000a0080022400244004440026014444a666ae68c01c00440084cc00c004cdc30010009111111100291111110021b8148000dc3a40006e1d2002370e90021b874801955cf2ab9d23230010012233003300200200101',
    };

    constructor(requestConfig: RequestConfig = {}) {
        super();

        this.api = new MuesliSwapApi(this, requestConfig);
    }

    public async liquidityPoolAddresses(provider: BaseDataProvider): Promise<string[]> {
        const validityAsset: Asset = Asset.fromIdentifier(this.factoryToken);
        const assetAddresses: AssetAddress[] = await provider.assetAddresses(validityAsset);

        return Promise.resolve([...new Set(assetAddresses.map((assetAddress: AssetAddress) => assetAddress.address))]);
    }

    async liquidityPools(provider: BaseDataProvider): Promise<LiquidityPool[]> {
        const validityAsset: Asset = Asset.fromIdentifier(this.factoryToken);
        const poolAddresses: string[] = await this.liquidityPoolAddresses(provider);

        const addressPromises: Promise<LiquidityPool[]>[] = poolAddresses.map(async (address: string) => {
            const utxos: UTxO[] = await provider.utxos(address, validityAsset);

            return await Promise.all(
                utxos.map(async (utxo: UTxO): Promise<LiquidityPool | undefined> => {
                    return await this.liquidityPoolFromUtxo(provider, utxo);
                })
            )
            .then((liquidityPools: (LiquidityPool | undefined)[]) => {
                return liquidityPools.filter((liquidityPool?: LiquidityPool): boolean => {
                    return liquidityPool !== undefined;
                }) as LiquidityPool[]
            });
        });

        return Promise.all(addressPromises)
            .then((liquidityPools: (Awaited<LiquidityPool[]>)[]) => liquidityPools.flat());
    }

    public async liquidityPoolFromUtxo(provider: BaseDataProvider, utxo: UTxO): Promise<LiquidityPool | undefined> {
        if (! utxo.datumHash) {
            return Promise.resolve(undefined);
        }

        const relevantAssets: AssetBalance[] = utxo.assetBalances.filter((assetBalance: AssetBalance) => {
            const assetBalanceId: string = assetBalance.asset === 'lovelace' ? 'lovelace' : assetBalance.asset.identifier();

            return ! assetBalanceId.startsWith(this.factoryToken.slice(0, 56))
                && ! [this.poolNftPolicyIdV1, this.poolNftPolicyIdV2].includes(assetBalanceId);
        });

        // Irrelevant UTxO
        if (relevantAssets.length < 2) {
            return Promise.resolve(undefined);
        }

        try {
            const builder: DefinitionBuilder = await (new DefinitionBuilder())
                .loadDefinition(pool);
            const datum: DefinitionField = await provider.datumValue(utxo.datumHash);
            const parameters: DatumParameters = builder.pullParameters(datum as DefinitionConstr);

            const tokenA: Token = parameters.PoolAssetAPolicyId
                ? new Asset(parameters.PoolAssetAPolicyId as string, parameters.PoolAssetAAssetName as string)
                : 'lovelace';
            const tokenB: Token = parameters.PoolAssetBPolicyId
                ? new Asset(parameters.PoolAssetBPolicyId as string, parameters.PoolAssetBAssetName as string)
                : 'lovelace';

            const liquidityPool: LiquidityPool = new LiquidityPool(
                MuesliSwap.identifier,
                tokenA,
                tokenB,
                relevantAssets.find((balance: AssetBalance) => tokensMatch(tokenA, balance.asset))?.quantity ?? 0n,
                relevantAssets.find((balance: AssetBalance) => tokensMatch(tokenB, balance.asset))?.quantity ?? 0n,
                utxo.address,
                this.orderAddress,
                this.orderAddress,
            );

            // Load additional pool information
            const lpToken: Asset = utxo.assetBalances.find((assetBalance: AssetBalance) => {
                return assetBalance.asset !== 'lovelace' && [this.poolNftPolicyIdV1, this.poolNftPolicyIdV2].includes(assetBalance.asset.policyId);
            })?.asset as Asset;

            if (lpToken) {
                lpToken.policyId = this.lpTokenPolicyId;
                liquidityPool.lpToken = lpToken;
                liquidityPool.identifier = lpToken.identifier();
            }

            liquidityPool.totalLpTokens = typeof parameters.TotalLpTokens === 'number'
                ? BigInt(parameters.TotalLpTokens)
                : 0n;
            liquidityPool.poolFeePercent = typeof parameters.LpFee === 'number'
                ? parameters.LpFee / 100
                : 0;

            return Promise.resolve(liquidityPool);
        } catch (e) {
            return Promise.resolve(undefined);
        }
    }

    estimatedGive(liquidityPool: LiquidityPool, swapOutToken: Token, swapOutAmount: bigint): bigint {
        const [reserveOut, reserveIn]: bigint[] = correspondingReserves(liquidityPool, swapOutToken);

        const receive: number = (Number(reserveIn) * Number(reserveOut)) / (Number(reserveOut) - Number(swapOutAmount)) - Number(reserveIn);

        return BigInt(Math.floor(Number(receive) * (1 + liquidityPool.poolFeePercent / 100)));
    }

    estimatedReceive(liquidityPool: LiquidityPool, swapInToken: Token, swapInAmount: bigint): bigint {
        const [reserveIn, reserveOut]: bigint[] = correspondingReserves(liquidityPool, swapInToken);

        const swapFee: bigint = ((swapInAmount * BigInt(Math.floor(liquidityPool.poolFeePercent * 100))) + BigInt(10000) - 1n) / 10000n;
        const adjustedSwapInAmount: bigint = swapInAmount - swapFee;

        const estimatedReceive: number = Number(reserveOut) - (Number(reserveIn) * Number(reserveOut)) / (Number(reserveIn) + Number(adjustedSwapInAmount));

        return BigInt(Math.floor(estimatedReceive));
    }

    priceImpactPercent(liquidityPool: LiquidityPool, swapInToken: Token, swapInAmount: bigint): number {
        const [reserveIn, reserveOut]: bigint[] = correspondingReserves(liquidityPool, swapInToken);

        const estimatedReceive: bigint = this.estimatedReceive(liquidityPool, swapInToken, swapInAmount);

        const oldPrice: number = Number(reserveIn) / Number(reserveOut);
        const swapPrice: number = Number(swapInAmount) / Number(estimatedReceive);

        return(swapPrice - oldPrice) / oldPrice * 100;
    }

    public async buildSwapOrder(liquidityPool: LiquidityPool, swapParameters: DatumParameters, spendUtxos: SpendUTxO[] = []): Promise<PayToAddress[]> {
        const matchMakerFee: SwapFee | undefined = this.swapOrderFees().find((fee: SwapFee): boolean => fee.id === 'matchmakerFee');
        const deposit: SwapFee | undefined = this.swapOrderFees().find((fee: SwapFee): boolean => fee.id === 'deposit');

        if (! matchMakerFee || ! deposit || ! swapParameters[DatumParameterKey.MinReceive]) {
            return Promise.reject('Parameters for datum are not set.');
        }

        swapParameters = {
            ...swapParameters,
            [DatumParameterKey.TotalFees]: matchMakerFee.value + deposit.value,
            [DatumParameterKey.AllowPartialFill]: 1,
        };

        // Asset -> ADA swap
        if (! swapParameters[DatumParameterKey.SwapOutTokenPolicyId]) {
            (swapParameters[DatumParameterKey.MinReceive] as bigint) -= matchMakerFee.value;
        }

        const datumBuilder: DefinitionBuilder = new DefinitionBuilder();
        await datumBuilder.loadDefinition(order)
            .then((builder: DefinitionBuilder) => {
                builder.pushParameters(swapParameters);
            });

        return [
            this.buildSwapOrderPayment(
                swapParameters,
                {
                    address: this.orderAddress,
                    addressType: AddressType.Contract,
                    assetBalances: [
                        {
                            asset: 'lovelace',
                            quantity: matchMakerFee.value + deposit.value,
                        },
                    ],
                    datum: datumBuilder.getCbor(),
                    isInlineDatum: false,
                    spendUtxos: spendUtxos,
                }
            )
        ];
    }

    public async buildCancelSwapOrder(txOutputs: UTxO[], returnAddress: string): Promise<PayToAddress[]> {
        const relevantUtxo: UTxO | undefined = txOutputs.find((utxo: UTxO): boolean => {
            return utxo.address === this.orderAddress;
        });

        if (! relevantUtxo) {
            return Promise.reject('Unable to find relevant UTxO for cancelling the swap order.');
        }

        return [
            {
                address: returnAddress,
                addressType: AddressType.Base,
                assetBalances: relevantUtxo.assetBalances,
                isInlineDatum: false,
                spendUtxos: [{
                    utxo: relevantUtxo,
                    redeemer: this.cancelDatum,
                    validator: this.orderScript,
                    signer: returnAddress,
                }],
            }
        ];
    }

    public swapOrderFees(): SwapFee[] {
        return [
            {
                id: 'matchmakerFee',
                title: 'Matchmaker Fee',
                description: 'Fee to cover costs for the order matchmakers.',
                value: 950000n,
                isReturned: false,
            },
            {
                id: 'deposit',
                title: 'Deposit',
                description: 'This amount of ADA will be held as minimum UTxO ADA and will be returned when your order is processed or cancelled.',
                value: 1_700000n,
                isReturned: true,
            },
        ];
    }

}
