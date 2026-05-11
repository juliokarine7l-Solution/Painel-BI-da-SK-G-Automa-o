export const parseMoney = (val: string | number): number => {
    if (typeof val === 'number') return val;
    return parseFloat(val.replace(/[R$\s.]/g, '').replace(',', '.')) || 0;
};
