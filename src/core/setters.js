import"noname";function e(){return{activeElement(e){const t=decadeUI.$activeElement;t!==e&&(decadeUI.$activeElement=e,t?.ondeactive?.(),e?.onactive?.())}}}export{e as createDecadeUISetModule};
