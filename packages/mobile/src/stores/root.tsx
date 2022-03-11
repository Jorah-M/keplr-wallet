import { EmbedChainInfos } from "../config";
import {
  KeyRingStore,
  InteractionStore,
  QueriesStore,
  CoinGeckoPriceStore,
  AccountStore,
  SignInteractionStore,
  TokensStore,
  QueriesWithCosmosAndSecretAndCosmwasm,
  AccountWithAll,
  LedgerInitStore,
  IBCCurrencyRegsitrar,
  PermissionStore,
} from "@keplr-wallet/stores";
import { AsyncKVStore } from "../common";
import { APP_PORT } from "@keplr-wallet/router";
import { ChainInfoWithEmbed } from "@keplr-wallet/background";
import { RNEnv, RNRouterUI, RNMessageRequesterInternal } from "../router";
import { ChainStore } from "./chain";
import EventEmitter from "eventemitter3";
import { Keplr } from "@keplr-wallet/provider";
import { KeychainStore } from "./keychain";
import { WalletConnectStore } from "./wallet-connect";
import { AnalyticsStore } from "./analytics";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

export class RootStore {
  public readonly chainStore: ChainStore;
  public readonly keyRingStore: KeyRingStore;

  protected readonly interactionStore: InteractionStore;
  public readonly permissionStore: PermissionStore;
  public readonly ledgerInitStore: LedgerInitStore;
  public readonly signInteractionStore: SignInteractionStore;

  public readonly queriesStore: QueriesStore<QueriesWithCosmosAndSecretAndCosmwasm>;
  public readonly accountStore: AccountStore<AccountWithAll>;
  public readonly priceStore: CoinGeckoPriceStore;
  public readonly tokensStore: TokensStore<ChainInfoWithEmbed>;

  protected readonly ibcCurrencyRegistrar: IBCCurrencyRegsitrar<ChainInfoWithEmbed>;

  public readonly keychainStore: KeychainStore;
  public readonly walletConnectStore: WalletConnectStore;
  public readonly analyticsStore: AnalyticsStore;

  constructor() {
    const router = new RNRouterUI(RNEnv.produceEnv);

    const eventEmitter = new EventEmitter();

    // Order is important.
    this.interactionStore = new InteractionStore(
      router,
      new RNMessageRequesterInternal()
    );
    this.permissionStore = new PermissionStore(
      this.interactionStore,
      new RNMessageRequesterInternal()
    );
    this.ledgerInitStore = new LedgerInitStore(
      this.interactionStore,
      new RNMessageRequesterInternal()
    );
    this.signInteractionStore = new SignInteractionStore(this.interactionStore);

    this.chainStore = new ChainStore(
      EmbedChainInfos,
      new RNMessageRequesterInternal(),
      new AsyncKVStore("store_chains")
    );

    this.keyRingStore = new KeyRingStore(
      {
        dispatchEvent: (type: string) => {
          eventEmitter.emit(type);
        },
      },
      "pbkdf2",
      this.chainStore,
      new RNMessageRequesterInternal(),
      this.interactionStore
    );

    if (Platform.OS === "android") {
      (async () => {
        let needClear = true;
        try {
          if (await AsyncStorage.getItem("__hotfix__clear_legacy_store")) {
            needClear = false;
          }
        } catch (e) {
          console.log(e);
        }
        if (needClear) {
          console.log("Try to clear legacy store");
          try {
            const keys = await AsyncStorage.getAllKeys();
            if (keys) {
              for (const key of keys) {
                if (
                  key.startsWith("store_queries/") ||
                  key.startsWith("store_queries_fix/") ||
                  key.startsWith("store_queries_fix2/")
                ) {
                  await AsyncStorage.removeItem(key);
                }
              }

              await AsyncStorage.setItem(
                "__hotfix__clear_legacy_store",
                "cleared"
              );
            }
          } catch (e) {
            console.log(e);
          }
        }
      })();
    }

    this.queriesStore = new QueriesStore(
      // Fix prefix key because there was a problem with storage being corrupted.
      // In the case of storage where the prefix key is "store_queries" or "store_queries_fix", "store_queries_fix2",
      // we should not use it because it is already corrupted in some users.
      // https://github.com/chainapsis/keplr-wallet/issues/275
      // https://github.com/chainapsis/keplr-wallet/issues/278
      // https://github.com/chainapsis/keplr-wallet/issues/318
      new AsyncKVStore("store_queries_fix3"),
      this.chainStore,
      async () => {
        // TOOD: Set version for Keplr API
        return new Keplr("", "core", new RNMessageRequesterInternal());
      },
      QueriesWithCosmosAndSecretAndCosmwasm
    );

    this.accountStore = new AccountStore<AccountWithAll>(
      {
        addEventListener: (type: string, fn: () => void) => {
          eventEmitter.addListener(type, fn);
        },
        removeEventListener: (type: string, fn: () => void) => {
          eventEmitter.removeListener(type, fn);
        },
      },
      AccountWithAll,
      this.chainStore,
      this.queriesStore,
      {
        defaultOpts: {
          prefetching: false,
          suggestChain: false,
          autoInit: true,
          getKeplr: async () => {
            // TOOD: Set version for Keplr API
            return new Keplr("", "core", new RNMessageRequesterInternal());
          },
        },
        chainOpts: this.chainStore.chainInfos.map((chainInfo) => {
          if (chainInfo.chainId.startsWith("osmosis")) {
            return {
              chainId: chainInfo.chainId,
              msgOpts: {
                withdrawRewards: {
                  gas: 200000,
                },
              },
            };
          }

          return { chainId: chainInfo.chainId };
        }),
      }
    );

    this.priceStore = new CoinGeckoPriceStore(
      new AsyncKVStore("store_prices"),
      {
        usd: {
          currency: "usd",
          symbol: "$",
          maxDecimals: 2,
          locale: "en-US",
        },
        eur: {
          currency: "eur",
          symbol: "€",
          maxDecimals: 2,
          locale: "de-DE",
        },
        gbp: {
          currency: "gbp",
          symbol: "£",
          maxDecimals: 2,
          locale: "en-GB",
        },
        cad: {
          currency: "cad",
          symbol: "CA$",
          maxDecimals: 2,
          locale: "en-CA",
        },
        rub: {
          currency: "rub",
          symbol: "₽",
          maxDecimals: 0,
          locale: "ru",
        },
        krw: {
          currency: "krw",
          symbol: "₩",
          maxDecimals: 0,
          locale: "ko-KR",
        },
        hkd: {
          currency: "hkd",
          symbol: "HK$",
          maxDecimals: 1,
          locale: "en-HK",
        },
        cny: {
          currency: "cny",
          symbol: "¥",
          maxDecimals: 1,
          locale: "zh-CN",
        },
        jpy: {
          currency: "jpy",
          symbol: "¥",
          maxDecimals: 0,
          locale: "ja-JP",
        },
      },
      "usd"
    );

    this.tokensStore = new TokensStore(
      {
        addEventListener: (type: string, fn: () => void) => {
          eventEmitter.addListener(type, fn);
        },
      },
      this.chainStore,
      new RNMessageRequesterInternal(),
      this.interactionStore
    );

    this.ibcCurrencyRegistrar = new IBCCurrencyRegsitrar<ChainInfoWithEmbed>(
      new AsyncKVStore("store_test_ibc_currency_registrar"),
      24 * 3600 * 1000,
      this.chainStore,
      this.accountStore,
      this.queriesStore,
      this.queriesStore
    );

    router.listen(APP_PORT);

    this.keychainStore = new KeychainStore(
      new AsyncKVStore("store_keychain"),
      this.keyRingStore
    );

    this.walletConnectStore = new WalletConnectStore(
      new AsyncKVStore("store_wallet_connect"),
      {
        addEventListener: (type: string, fn: () => void) => {
          eventEmitter.addListener(type, fn);
        },
        removeEventListener: (type: string, fn: () => void) => {
          eventEmitter.removeListener(type, fn);
        },
      },
      this.chainStore,
      this.keyRingStore,
      this.permissionStore
    );

    this.analyticsStore = new AnalyticsStore(
      "KeplrMobile",
      this.accountStore,
      this.keyRingStore
    );
  }
}

export function createRootStore() {
  return new RootStore();
}
