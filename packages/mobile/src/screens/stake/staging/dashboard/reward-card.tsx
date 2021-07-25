import React, { FunctionComponent } from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "../../../../stores";
import { Card, CardBody } from "../../../../components/staging/card";
import { Text, View, ViewStyle } from "react-native";
import { useStyle } from "../../../../styles";
import { Button } from "../../../../components/staging/button";

export const MyRewardCard: FunctionComponent<{
  containerStyle?: ViewStyle;
}> = observer(({ containerStyle }) => {
  const { chainStore, accountStore, queriesStore } = useStore();

  const account = accountStore.getAccount(chainStore.current.chainId);
  const queries = queriesStore.get(chainStore.current.chainId);

  const pendingStakableReward = queries.cosmos.queryRewards.getQueryBech32Address(
    account.bech32Address
  ).stakableReward;

  const apy = queries.cosmos.queryInflation.inflation;

  const style = useStyle();

  return (
    <Card style={containerStyle}>
      <CardBody>
        <Text
          style={style.flatten([
            "h4",
            "color-text-black-very-high",
            "margin-bottom-12",
          ])}
        >
          My Reward
        </Text>
        <View style={style.flatten(["flex-row"])}>
          <View style={style.flatten(["flex-1"])}>
            <Text
              style={style.flatten([
                "body3",
                "color-text-black-low",
                "uppercase",
              ])}
            >
              My Pending Reward
            </Text>
            <Text style={style.flatten(["h3", "color-text-black-high"])}>
              {pendingStakableReward
                .maxDecimals(4)
                .shrink(true)
                .trim(true)
                .toString()}
            </Text>
          </View>
          <View style={style.flatten(["flex-1"])}>
            <Text
              style={style.flatten([
                "body3",
                "color-text-black-low",
                "uppercase",
              ])}
            >
              Live Staking Reward
            </Text>
            <Text style={style.flatten(["h3", "color-text-black-high"])}>
              {`${apy.maxDecimals(2).trim(true).toString()}% / year`}
            </Text>
          </View>
        </View>
        <Button
          containerStyle={style.flatten(["margin-top-12"])}
          text="Claim All rewards"
          mode="light"
        />
      </CardBody>
    </Card>
  );
});
