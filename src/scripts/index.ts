const sin = Math.sin;
const cos = Math.cos;
const asin = Math.asin;

declare let _: any;
// Math.seedrandom('kirilyuro');

window.onload = function () {
    let canvas: HTMLCanvasElement = document.getElementById('drawing-pane') as HTMLCanvasElement;
    let barkPatternImage = document.getElementById('bark_pattern') as HTMLImageElement;
    let leafImage = document.getElementById('leaf-image') as HTMLImageElement;

    let ctx = canvas.getContext("2d");
    // ctx.scale(0.4,0.4);

    let treeBuilderParams: TreeBuilderParams = {
        origin: new Point2D(500, 30),
        trunkHeight: 70,
        trunkWidth: 10,
        trunkDirection: new Point2D(0, 1),
        minBranchLength: 10,
        minDirectionOffset: 15,
        maxDirectionOffset: 30,
        branchTrimmingCoefficient: 0.015,
        minBranchShorteningPercentage: 75,
        maxBranchShorteningPercentage: 90
    };

    let treeBuilder = new TreeBuilder(treeBuilderParams);
    let tree = treeBuilder.buildTree();

    let treeRendererParams: TreeRendererParams = {
        branchStyle: ctx.createPattern(barkPatternImage, 'repeat'),
        animateLeaves: true,
        branchAnimationTimeout: 50,
        leafAnimationTimeout: 50,
        leafAnimationSizeStep: 2,
        branchSegmentsNumber: 10,
        minLeafSize: 6,
        maxLeafSize: 11,
        leafGrowthCoefficient: 0.02,
        leafImage: leafImage
    };
    let treeDrawer = new TreeRenderer(treeRendererParams);
    treeDrawer.animateDrawTree(ctx, tree.trunk);
};

function degToRad(deg: number): number {
    return deg / 180.0 * Math.PI;
}

class Point2D {
    public constructor(
        public x: number,
        public y: number
    ) {}
}

type Vector2D = Point2D;

class BranchSegment {
    public constructor(
        public start: Point2D,
        public end: Point2D,
        public width: number,
        public direction: Vector2D,
        public branchLevel: number
    ) {}
}

class Tree {
    public constructor(
        public trunk: Branch
    ) {}
}

class Branch {
    public subBranches: Array<Branch>;
    public origin: Point2D;
    public direction: Vector2D;
    public length: number;
    public width: number;
    public level: number;
}

class TreeBuilder {

    public constructor(public params: TreeBuilderParams) {
    }

    public buildTree(): Tree {
        let trunk = new Branch();
        trunk.origin = this.params.origin;
        trunk.length = this.params.trunkHeight;
        trunk.width = this.params.trunkWidth;
        trunk.direction = this.params.trunkDirection;
        trunk.level = 0;
        this.buildBranches(trunk);
        return new Tree(trunk);
    }

    private buildBranches(root: Branch): void {
        if (this.shouldTrimSubBranches(root)) return;

        root.subBranches = root.subBranches || [];

        this.buildLeftBranch(root);
        this.buildRightBranch(root);
    }

    private shouldTrimSubBranches(branch: Branch): boolean {
        return Math.random() > (1 - branch.level * this.params.branchTrimmingCoefficient)
            || branch.length < this.params.minBranchLength;
    }

    private buildLeftBranch(root: Branch): void {
        let directionOffset = this.getDirectionOffset();
        let rootX = root.direction.x;
        let rootY = root.direction.y;
        let newDirection = new Point2D(
            rootX * cos(directionOffset) - rootY * sin(directionOffset),
            rootX * sin(directionOffset) + rootY * cos(directionOffset)
        );
        this.buildBranchInDirection(root, newDirection);
    }

    private buildRightBranch(root: Branch): void {
        let directionOffset = this.getDirectionOffset();
        let rootX = root.direction.x;
        let rootY = root.direction.y;
        let newDirection = new Point2D(
            rootX * cos(directionOffset) + rootY * sin(directionOffset),
            rootY * cos(directionOffset) - rootX * sin(directionOffset)
        );
        this.buildBranchInDirection(root, newDirection);
    }

    private getDirectionOffset(): number {
        let dirOffsetInDeg = _.random(this.params.minDirectionOffset, this.params.maxDirectionOffset);
        return degToRad(dirOffsetInDeg);
    }

    private buildBranchInDirection(root: Branch, direction: Vector2D): void {
        let rootEnd = new Point2D(
            root.origin.x + root.length * root.direction.x,
            root.origin.y + root.length * root.direction.y
        );
        let newBranch = new Branch();
        newBranch.level = root.level + 1;
        newBranch.direction = direction;
        newBranch.length = Math.floor(root.length * _.random(
            this.params.minBranchShorteningPercentage, this.params.maxBranchShorteningPercentage) / 100);
        newBranch.width = root.width > 1 ? root.width - 1 : root.width;
        newBranch.origin = rootEnd;
        newBranch.subBranches = [];
        root.subBranches.push(newBranch);
        this.buildBranches(newBranch);
    }
}

class TreeBuilderParams {
    public origin: Point2D;
    public trunkHeight: number;
    public trunkWidth: number;
    public trunkDirection: Vector2D;
    public minBranchLength: number;
    public minDirectionOffset: number;
    public maxDirectionOffset: number;
    public branchTrimmingCoefficient: number;
    public minBranchShorteningPercentage: number;
    public maxBranchShorteningPercentage: number;
}

class TreeRenderer {
    public constructor(public params: TreeRendererParams) {
    }

    public drawTree(g: CanvasRenderingContext2D, root: Branch): void {
        let start = root.origin;
        let end = new Point2D(
            root.origin.x + root.length * root.direction.x,
            root.origin.y + root.length * root.direction.y
        );

        this.drawBranchSegment(g, new BranchSegment(start, end, root.width, root.direction, root.level));

        root.subBranches.forEach(branch => this.drawTree(g, branch));
    }

    public animateDrawTree(g: CanvasRenderingContext2D, root: Branch): void {
        this.animateDrawTreeLevel(g, [root]);
    }

    private animateDrawTreeLevel(g: CanvasRenderingContext2D, branches: Array<Branch>): void {
        if (branches.length === 0) {
            console.log('Finished!');
            return;
        }

        let branchesSegments = branches.map(this.getBranchSegments.bind(this)) as Array<Array<BranchSegment>>;
        let maxNumSegments = _(branchesSegments).chain()
            .map(branchSegments => branchSegments.length)
            .max().value();

        this.timeoutAnimateDrawTreeLevel(g, branches, 0, maxNumSegments, branchesSegments);
    }

    private timeoutAnimateDrawTreeLevel(
        g: CanvasRenderingContext2D, branches: Array<Branch>, currentSegmentIndex: number,
        maxNumSegments: number, branchesSegments: Array<Array<BranchSegment>>): void {

        if (currentSegmentIndex === maxNumSegments) {
            let nextBranches = _(branches).chain().map(branch => branch.subBranches).flatten().value() as Array<Branch>;
            this.animateDrawTreeLevel(g, nextBranches);
            return;
        }

        branchesSegments.forEach(branchSegments => {
            if (currentSegmentIndex >= branchSegments.length) return;
            this.drawBranchSegment(g, branchSegments[currentSegmentIndex]);
        });

        setTimeout(this.timeoutAnimateDrawTreeLevel.bind(this),
            this.params.branchAnimationTimeout, g, branches,
            currentSegmentIndex + 1, maxNumSegments, branchesSegments
        );
    }

    private getBranchSegments(branch: Branch): Array<BranchSegment> {
        let numSegments = this.params.branchSegmentsNumber;
        let segments: Array<BranchSegment> = [];
        let lastSegmentEnd = branch.origin;

        let segmentLengths = _.times(numSegments, () => Math.floor(branch.length / numSegments));
        let lengthDifference = branch.length - segmentLengths.reduce((prev, curr) => prev + curr, 0);
        for (let i = 0; i < lengthDifference; i++) {
            segmentLengths[i] += 1;
        }

        for (let i = 0; i < numSegments; i++) {
            let currentSegmentStart = lastSegmentEnd;
            let currentSegmentEnd = new Point2D(
                currentSegmentStart.x + segmentLengths[i] * branch.direction.x,
                currentSegmentStart.y + segmentLengths[i] * branch.direction.y
            );
            segments.push(new BranchSegment(
                currentSegmentStart, currentSegmentEnd, branch.width, branch.direction, branch.level
            ));
            lastSegmentEnd = currentSegmentEnd;
        }

        return segments;
    }

    private drawBranchSegment(g: CanvasRenderingContext2D, segment: BranchSegment): void {
        g.beginPath();

        g.lineWidth = segment.width;
        g.strokeStyle = this.params.branchStyle;
        g.moveTo(segment.start.x, segment.start.y);
        g.lineTo(segment.end.x, segment.end.y);
        g.stroke();

        g.closePath();

        this.maybeDrawLeaf(g, segment.end, segment.branchLevel, segment.direction);
    }

    private maybeDrawLeaf(g: CanvasRenderingContext2D, location: Point2D, branchLevel: number, direction: Vector2D): void {
        if (Math.random() > (1 - this.params.leafGrowthCoefficient * branchLevel)) {
            let leafSize = _.random(this.params.minLeafSize, this.params.maxLeafSize);
            if (this.params.animateLeaves)
                this.animateDrawLeaf(g, location, direction, leafSize);
            else
                this.drawLeaf(g, location, direction, leafSize);
        }
    }

    private drawLeaf(g: CanvasRenderingContext2D, location: Point2D, direction: Vector2D, size: number): void {
        g.save();
        g.translate(location.x, location.y);

        if (direction.x > 0 && direction.y > 0)
            g.rotate(asin(direction.x));
        else if (direction.x < 0 && direction.y > 0)
            g.rotate(-asin(direction.x));
        else
            g.rotate(Math.PI + asin(direction.x));

        g.drawImage(this.params.leafImage, 0, 0, size, size);
        g.restore();
    }

    private animateDrawLeaf(g: CanvasRenderingContext2D, location: Point2D, direction: Vector2D, size: number): void {
        this.timeoutAnimateDrawLeaf(g, location, direction, 1, size);
    }

    private timeoutAnimateDrawLeaf(
        g: CanvasRenderingContext2D, location: Point2D, direction: Vector2D,
        currentSize: number, maxSize: number): void {

        if (currentSize > maxSize) return;
        this.drawLeaf(g, location, direction, currentSize);
        setTimeout(this.timeoutAnimateDrawLeaf.bind(this),
            this.params.leafAnimationTimeout, g, location, direction,
            currentSize + this.params.leafAnimationSizeStep, maxSize
        );
    }
}

class TreeRendererParams {
    public branchStyle: string | CanvasGradient | CanvasPattern;
    public animateLeaves: boolean;
    public branchAnimationTimeout: number;
    public leafAnimationTimeout: number;
    public leafAnimationSizeStep: number;
    public branchSegmentsNumber: number;
    public minLeafSize: number;
    public maxLeafSize: number;
    public leafGrowthCoefficient: number;
    public leafImage: HTMLImageElement;
}