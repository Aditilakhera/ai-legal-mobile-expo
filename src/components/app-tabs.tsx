import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColorScheme } from 'react-native';

import { Colors } from '@/constants/theme';

export default function AppTabs() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === 'dark' ? 'dark' : 'light'];
  const NativeTabsAny = NativeTabs as any;
  const Trigger = NativeTabsAny.Trigger;
  const Label = Trigger.Label;
  const Icon = Trigger.Icon;

  return (
    <NativeTabsAny
      backgroundColor={colors.background}
      indicatorColor={colors.backgroundElement}
      labelStyle={{ selected: { color: colors.text } }}>
      <Trigger name="index">
        <Label>Home</Label>
        <Icon
          src={require('@/assets/images/tabIcons/home.png')}
          renderingMode="template"
        />
      </Trigger>

      <Trigger name="explore">
        <Label>Explore</Label>
        <Icon
          src={require('@/assets/images/tabIcons/explore.png')}
          renderingMode="template"
        />
      </Trigger>
    </NativeTabsAny>
  );
}
