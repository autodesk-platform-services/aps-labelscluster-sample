class LabelsClusterExtension extends Autodesk.Viewing.Extension {
  constructor(viewer, options) {
    super(viewer, options);
    this._button = null;
    this._changeInProgress = false;
    //treshold in pixels
    this.treshold = 80;
    this._onObjectTreeCreated = (ev) => this.onModelLoaded(ev.model);
  }

  async onModelLoaded(model) {
    this.dataVizExtn = await this.viewer.getExtension("Autodesk.DataVisualization");
    await this.prepareDataViz();
    this.viewer.addEventListener(Autodesk.Viewing.CAMERA_CHANGE_EVENT, this.groupAndRenderLabels.bind(this));
  }

  groupAndRenderLabels() {
    if (!this._changeInProgress) {
      this._changeInProgress = true;
      this.scheduleChange();
    }
  }

  scheduleChange() {
    setTimeout(() => {
      let indexGroups;
      if (this._button.getState() == Autodesk.Viewing.UI.Button.State.ACTIVE) {
        indexGroups = this.findIndexGroups();
      }
      else {
        indexGroups = document.labelsJSON.labelsPositions.map((p, i) => [i]);
      }
      this.replaceLabels(9999, indexGroups);
      this._changeInProgress = false;
    }, 200);
  }

  findIndexGroups() {
    let indexGroups = [];
    for (let i = 0; i < document.labelsJSON.labelsPositions.length; i++) {
      let currentPosition = this.viewer.worldToClient(document.labelsJSON.labelsPositions[i]);
      const currentIndexColumn = Math.floor(currentPosition.x / this.treshold);
      const currentIndexRow = Math.floor(currentPosition.y / this.treshold);
      if (!indexGroups[currentIndexRow]) {
        indexGroups[currentIndexRow] = [];
      }
      if (!indexGroups[currentIndexRow][currentIndexColumn]) {
        indexGroups[currentIndexRow][currentIndexColumn] = [];
      }
      indexGroups[currentIndexRow][currentIndexColumn].push(i);
    }
    return indexGroups.flat();
  }

  async load() {
    this.viewer.addEventListener(Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT, this._onObjectTreeCreated);
    return true;
  }

  replaceLabels(dbId, indexGroups) {
    let DataVizCore = Autodesk.DataVisualization.Core;
    this.dataVizExtn.removeAllViewables();
    this.viewableData = new DataVizCore.ViewableData();
    this.viewableData.spriteSize = 32;

    for (let indexGroup of indexGroups) {
      dbId++;
      let spritePoint;
      let spriteStyle;
      if (indexGroup.length > 1) {
        spritePoint = this.findMiddlePoint(indexGroup);
        spriteStyle = this.pointStyles[1];
      }
      else {
        spritePoint = document.labelsJSON.labelsPositions[indexGroup[0]];
        spriteStyle = this.pointStyles[0];
      }
      let viewable = new DataVizCore.SpriteViewable(spritePoint, spriteStyle, dbId);
      this.viewableData.addViewable(viewable);
    }

    this.viewableData.finish().then(() => {
      this.dataVizExtn.addViewables(this.viewableData);
    });
  }

  findMiddlePoint(indexGroup) {
    let positions = indexGroup.map(index => document.labelsJSON.labelsPositions[index]);
    let middleX = positions.map(p => p.x).reduce((acc, cur) => acc + cur, 0) / indexGroup.length;
    let middleY = positions.map(p => p.y).reduce((acc, cur) => acc + cur, 0) / indexGroup.length;
    let middleZ = positions.map(p => p.z).reduce((acc, cur) => acc + cur, 0) / indexGroup.length;
    return { x: middleX, y: middleY, z: middleZ };
  }

  async prepareDataViz() {
    this.dataVizExtn = this.viewer.getExtension("Autodesk.DataVisualization");
    let DataVizCore = Autodesk.DataVisualization.Core;
    this.viewableData = new DataVizCore.ViewableData();
    this.viewableData.spriteSize = 32; // Sprites as points of size 24 x 24 pixels
    let viewableType = DataVizCore.ViewableType.SPRITE;

    let pointsColor = new THREE.Color(0xffffff);

    let onePointIconUrl = "https://img.icons8.com/ios/50/null/1-circle.png";
    let multiplePointsIconUrl = "https://img.icons8.com/external-vitaliy-gorbachev-lineal-vitaly-gorbachev/50/null/external-numbers-support-vitaliy-gorbachev-lineal-vitaly-gorbachev.png";

    let onePointStyle = new DataVizCore.ViewableStyle(viewableType, pointsColor, onePointIconUrl);
    let multiplePointsStyle = new DataVizCore.ViewableStyle(viewableType, pointsColor, multiplePointsIconUrl);
    this.pointStyles = [
      onePointStyle,
      multiplePointsStyle
    ];
  }

  unload() {
    if (this._button) {
      this.removeToolbarButton(this._button);
      this._button = null;
    }
    return true;
  }

  onToolbarCreated() {
    this._button = this.createToolbarButton('labelscluster-button', 'https://img.icons8.com/ios/30/null/combine.png', 'Labels Cluster');
    this._button.onClick = () => {
      if (this._button.getState() == Autodesk.Viewing.UI.Button.State.ACTIVE) {
        this._button.setState(Autodesk.Viewing.UI.Button.State.INACTIVE);
      } else {
        this._button.setState(Autodesk.Viewing.UI.Button.State.ACTIVE);
      }
    };
  }

  createToolbarButton(buttonId, buttonIconUrl, buttonTooltip) {
    let group = this.viewer.toolbar.getControl('labels-toolbar-group');
    if (!group) {
      group = new Autodesk.Viewing.UI.ControlGroup('labels-toolbar-group');
      this.viewer.toolbar.addControl(group);
    }
    const button = new Autodesk.Viewing.UI.Button(buttonId);
    button.setToolTip(buttonTooltip);
    group.addControl(button);
    const icon = button.container.querySelector('.adsk-button-icon');
    if (icon) {
      icon.style.backgroundImage = `url(${buttonIconUrl})`;
      icon.style.backgroundSize = `24px`;
      icon.style.backgroundRepeat = `no-repeat`;
      icon.style.backgroundPosition = `center`;
    }
    return button;
  }

  removeToolbarButton(button) {
    const group = this.viewer.toolbar.getControl('labels-toolbar-group');
    group.removeControl(button);
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension('LabelsClusterExtension', LabelsClusterExtension);