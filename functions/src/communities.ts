export enum Community {
  MINAWAN = 'minawan',
  GOOMER = 'goomer',
  MINYAN = 'minyan',
  WORMPAL = 'wormpal'
}

export const communityChannels: { [key in Community]: string } = {
  minawan: 'cerbervt',
  goomer: 'gomi',
  minyan: 'minikomew',
  wormpal: 'chrchie'
};
