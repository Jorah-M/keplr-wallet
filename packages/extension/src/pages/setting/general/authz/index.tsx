import React, { FunctionComponent, useMemo, useState } from "react";
import { AuthZ } from "@keplr-wallet/stores";
import { observer } from "mobx-react-lite";
import { useStore } from "../../../../stores";
import { BackButton } from "../../../../layouts/header/components";
import { HeaderLayout } from "../../../../layouts/header";
import { DropDown } from "../../../../components/dropdown";
import { Box } from "../../../../components/box";
import { CollapsibleList } from "../../../../components/collapsible-list";
import { Body3, H4, Subtitle3 } from "../../../../components/typography";
import { Stack } from "../../../../components/stack";
import styled from "styled-components";
import { ColorPalette } from "../../../../styles";
import { Bech32Address } from "@keplr-wallet/cosmos";
import { FormattedDate } from "react-intl";
import { Columns } from "../../../../components/column";
import { useNavigate } from "react-router";

type grantListType = Record<string, AuthZ.Grant[]>;

export const SettingGeneralAuthZPage: FunctionComponent = observer(() => {
  const { chainStore, accountStore, queriesStore } = useStore();
  const navigate = useNavigate();

  const [chainId, setChainId] = useState<string>(
    chainStore.chainInfos[0].chainId
  );

  let grants = [] as AuthZ.Grant[];

  if (chainId) {
    const accountInfo = accountStore.getAccount(chainId);

    const queryAuthZGrants = queriesStore
      .get(chainId)
      .cosmos.queryAuthZGranter.getGranter(accountInfo.bech32Address);

    if (queryAuthZGrants.response?.data.grants) {
      grants = queryAuthZGrants.response?.data.grants;
    }
  }

  const items = chainStore.chainInfosInUI.map((chainInfo) => {
    return {
      key: chainInfo.chainId,
      label: chainInfo.chainName,
    };
  });

  const onClickAuthZItem = (title: string, grant: AuthZ.Grant) => {
    navigate("/setting/general/authz/revoke", {
      state: { title, grant, chainId },
    });
  };

  const grantList = useMemo(() => {
    const tempGrantList: grantListType = {
      Send: [],
      Delegate: [],
      Redelegate: [],
      Undelegate: [],
      "Withdraw Reward": [],
      Vote: [],
      Deposit: [],
      Custom: [],
    };

    const isSendAuthorization = (grant: AuthZ.Grant) =>
      grant.authorization["@type"] === "/cosmos.bank.v1beta1.SendAuthorization";

    const isGenericAuthorization = (grant: AuthZ.Grant) =>
      grant.authorization["@type"] ===
      "/cosmos.authz.v1beta1.GenericAuthorization";

    const isStakeAuthorization = (grant: AuthZ.Grant) =>
      grant.authorization["@type"] ===
      "/cosmos.staking.v1beta1.StakeAuthorization";

    if (grants) {
      grants.forEach((grant) => {
        if (
          isSendAuthorization(grant) ||
          (isGenericAuthorization(grant) &&
            (grant.authorization as AuthZ.GenericAuthorization).msg ===
              "/cosmos.bank.v1beta1.MsgSend")
        ) {
          tempGrantList["Send"].push(grant);
          return;
        }

        if (
          (isStakeAuthorization(grant) &&
            (grant.authorization as AuthZ.StakeAuthorization)
              .authorization_type === "AUTHORIZATION_TYPE_DELEGATE") ||
          (isGenericAuthorization(grant) &&
            (grant.authorization as AuthZ.GenericAuthorization).msg ===
              "/cosmos.staking.v1beta1.MsgDelegate")
        ) {
          tempGrantList["Delegate"].push(grant);
          return;
        }

        if (
          (isStakeAuthorization(grant) &&
            (grant.authorization as AuthZ.StakeAuthorization)
              .authorization_type === "AUTHORIZATION_TYPE_REDELEGATE") ||
          (isGenericAuthorization(grant) &&
            (grant.authorization as AuthZ.GenericAuthorization).msg ===
              "/cosmos.staking.v1beta1.MsgBeginRedelegate")
        ) {
          tempGrantList["Redelegate"].push(grant);
          return;
        }

        if (
          (isStakeAuthorization(grant) &&
            (grant.authorization as AuthZ.StakeAuthorization)
              .authorization_type === "AUTHORIZATION_TYPE_UNDELEGATE") ||
          (isGenericAuthorization(grant) &&
            (grant.authorization as AuthZ.GenericAuthorization).msg ===
              "/cosmos.staking.v1beta1.MsgUndelegate")
        ) {
          tempGrantList["Undelegate"].push(grant);
          return;
        }

        if (
          isGenericAuthorization(grant) &&
          (grant.authorization as AuthZ.GenericAuthorization).msg ===
            "/cosmos.distribution.v1beta1.MsgWithdrawDelegatorReward"
        ) {
          tempGrantList["Withdraw Reward"].push(grant);
          return;
        }

        if (
          isGenericAuthorization(grant) &&
          (grant.authorization as AuthZ.GenericAuthorization).msg ===
            "/cosmos.gov.v1beta1.MsgVote"
        ) {
          tempGrantList["Vote"].push(grant);
          return;
        }

        if (
          isGenericAuthorization(grant) &&
          (grant.authorization as AuthZ.GenericAuthorization).msg ===
            "/cosmos.gov.v1beta1.MsgDeposit"
        ) {
          tempGrantList["Deposit"].push(grant);
          return;
        }

        tempGrantList["Custom"].push(grant);
      });
    }

    return tempGrantList;
  }, [chainId, grants]);

  return (
    <HeaderLayout title="AuthZ List" left={<BackButton />}>
      <Box paddingX="0.75rem">
        <Box width="13rem" marginBottom="0.5rem">
          <DropDown
            items={items}
            selectedItemKey={chainId}
            onSelect={setChainId}
          />
        </Box>

        <Stack gutter="0.5rem">
          {grantList
            ? Object.entries(grantList).map(([title, grants]) => {
                if (grants.length === 0) {
                  return null;
                }

                return (
                  <CollapsibleList
                    key={title}
                    title={<H4>{title}</H4>}
                    items={grants.slice(2).map((grant) => (
                      <GrantView
                        key={`${grant.authorization}-${grant.grantee}-${grant.expiration}`}
                        grant={grant}
                        onClick={() => onClickAuthZItem(title, grant)}
                      />
                    ))}
                    alwaysShown={grants.slice(0, 2).map((grant) => (
                      <GrantView
                        key={`${grant.authorization}-${grant.grantee}-${grant.expiration}`}
                        grant={grant}
                        onClick={() => onClickAuthZItem(title, grant)}
                      />
                    ))}
                    right={grants.length}
                  />
                );
              })
            : null}
        </Stack>
      </Box>
    </HeaderLayout>
  );
});

const Styles = {
  Container: styled(Stack)`
    padding: 0.875rem;
    background-color: ${ColorPalette["gray-600"]};
  `,
  Title: styled(Subtitle3)`
    color: ${ColorPalette["gray-10"]};
  `,
  Paragraph: styled(Body3)`
    color: ${ColorPalette["gray-300"]};
  `,
};

const GrantView: FunctionComponent<{
  grant: AuthZ.Grant;
  onClick?: () => void;
}> = ({ grant, onClick }) => {
  return (
    <Box onClick={onClick}>
      <Styles.Container gutter="0.5rem">
        <Styles.Title>{`You authorized ${Bech32Address.shortenAddress(
          grant.grantee,
          20
        )}`}</Styles.Title>
        <Styles.Paragraph>
          {grant.expiration ? (
            new Date() < new Date(grant.expiration) ? (
              <Columns sum={1}>
                <Box>Expiration Date:&nbsp;</Box>

                <FormattedDate
                  value={grant.expiration}
                  year="numeric"
                  month="2-digit"
                  day="2-digit"
                  hour="2-digit"
                  minute="2-digit"
                  hour12={false}
                />
              </Columns>
            ) : (
              "Expired"
            )
          ) : (
            "No expiration"
          )}
        </Styles.Paragraph>
      </Styles.Container>
    </Box>
  );
};
